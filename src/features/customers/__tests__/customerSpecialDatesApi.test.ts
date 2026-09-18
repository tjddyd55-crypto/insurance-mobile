import {
  filterPersistableSpecialDateFormItems,
  saveCustomerSpecialDatesForCustomer,
  validateCustomerSpecialDateInput,
} from '../customerSpecialDatesApi';

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiRequest: jest.fn(),
}));

const { apiRequest } = jest.requireMock('../../../api/client');

describe('customerSpecialDatesApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows create with no alert dates', () => {
    expect(filterPersistableSpecialDateFormItems([])).toEqual([]);
    expect(validateCustomerSpecialDateInput({ title: '', dateValue: '' })).toContain('라벨');
  });

  it('accepts one alert date payload', () => {
    expect(
      validateCustomerSpecialDateInput({ title: '생일', dateValue: '2026-09-18' }),
    ).toBeNull();
    expect(
      filterPersistableSpecialDateFormItems([
        {
          purposeType: 'NOTICE',
          title: '생일',
          dateValue: '2026-09-18',
          memo: '',
        },
      ]),
    ).toHaveLength(1);
  });

  it('rejects invalid date format', () => {
    expect(
      validateCustomerSpecialDateInput({ title: '생일', dateValue: '18/09/2026' }),
    ).toContain('YYYY-MM-DD');
  });

  it('syncs create, update, and delete during save', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({
        specialDates: [
          {
            id: 1,
            customerId: 10,
            purposeType: 'NOTICE',
            title: '기존',
            dateValue: '2026-01-01',
            memo: '',
            sortOrder: 0,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 2,
            customerId: 10,
            purposeType: 'NOTICE',
            title: '삭제',
            dateValue: '2026-02-01',
            memo: '',
            sortOrder: 1,
            createdAt: '',
            updatedAt: '',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 1,
        customerId: 10,
        purposeType: 'NOTICE',
        title: '수정',
        dateValue: '2026-03-01',
        memo: '',
        sortOrder: 0,
        createdAt: '',
        updatedAt: '',
      })
      .mockResolvedValueOnce({
        id: 3,
        customerId: 10,
        purposeType: 'NOTICE',
        title: '신규',
        dateValue: '2026-04-01',
        memo: '',
        sortOrder: 0,
        createdAt: '',
        updatedAt: '',
      })
      .mockResolvedValueOnce(undefined);

    await saveCustomerSpecialDatesForCustomer({
      token: 'token',
      customerId: 10,
      formItems: [
        {
          id: 1,
          purposeType: 'NOTICE',
          title: '수정',
          dateValue: '2026-03-01',
          memo: '',
        },
        {
          purposeType: 'NOTICE',
          title: '신규',
          dateValue: '2026-04-01',
          memo: '',
        },
      ],
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/customers/10/special-dates/1', expect.objectContaining({ method: 'PATCH' }));
    expect(apiRequest).toHaveBeenCalledWith('/api/customers/10/special-dates', expect.objectContaining({ method: 'POST' }));
    expect(apiRequest).toHaveBeenCalledWith('/api/customers/10/special-dates/2', expect.objectContaining({ method: 'DELETE' }));
  });
});
