import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  validateCustomerForm,
} from '../customerForm';

describe('customer form', () => {
  it('requires a customer name', () => {
    expect(validateCustomerForm({ ...EMPTY_CUSTOMER_FORM }).name).toBeTruthy();
  });

  it('requires gender to be male or female', () => {
    expect(validateCustomerForm({ ...EMPTY_CUSTOMER_FORM, name: '홍길동' }).gender).toBe(
      '성별을 선택해 주세요.',
    );
    expect(
      validateCustomerForm({ ...EMPTY_CUSTOMER_FORM, name: '홍길동', gender: 'male' }).gender,
    ).toBeUndefined();
    expect(
      validateCustomerForm({ ...EMPTY_CUSTOMER_FORM, name: '홍길동', gender: 'female' }).gender,
    ).toBeUndefined();
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

  it('normalizes phone, resident number, booleans and empty nullable fields for the API', () => {
    const payload = customerFormToPayload({
      ...EMPTY_CUSTOMER_FORM,
      name: ' 홍길동 ',
      phone: '010-1234-5678',
      ssn: '900101-1234567',
      gender: 'male',
      driver: 'no',
      inflowSource: '소개',
      referrerName: ' 김소개 ',
      isFavorite: true,
    });
    expect(payload).toMatchObject({
      name: '홍길동',
      phone: '01012345678',
      ssn: '9001011234567',
      gender: 'male',
      isDriver: false,
      inflowSource: '소개',
      referrerName: '김소개',
      isFavorite: true,
    });
  });
});
