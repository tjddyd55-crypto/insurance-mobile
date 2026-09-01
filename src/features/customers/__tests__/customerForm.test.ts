import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  validateCustomerForm,
} from '../customerForm';

describe('customer form', () => {
  it('requires a customer name', () => {
    expect(validateCustomerForm({ ...EMPTY_CUSTOMER_FORM }).name).toBeTruthy();
  });

  it('validates optional phone, date, resident number and car year formats', () => {
    const errors = validateCustomerForm({
      ...EMPTY_CUSTOMER_FORM,
      name: '홍길동',
      phone: '010-12',
      ssn: '900101',
      birthDate: '2026-02-30',
      renewalDate: '2026/12/01',
      carYear: '26',
    });
    expect(errors).toMatchObject({
      phone: expect.any(String),
      ssn: expect.any(String),
      birthDate: expect.any(String),
      renewalDate: expect.any(String),
      carYear: expect.any(String),
    });
  });

  it('normalizes phone, booleans and empty nullable fields for the API', () => {
    const payload = customerFormToPayload({
      ...EMPTY_CUSTOMER_FORM,
      name: ' 홍길동 ',
      phone: '010-1234-5678',
      gender: 'male',
      driver: 'no',
      inflowSource: '소개',
      referrerName: ' 김소개 ',
      isFavorite: true,
    });
    expect(payload).toMatchObject({
      name: '홍길동',
      phone: '01012345678',
      gender: 'male',
      isDriver: false,
      inflowSource: '소개',
      referrerName: '김소개',
      isFavorite: true,
    });
  });
});
