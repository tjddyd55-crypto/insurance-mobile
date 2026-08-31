import type { SaveCustomerPayload } from './customersApi';
import type { CustomerRecord } from './types';

export type CustomerFormState = {
  name: string;
  ssn: string;
  gender: '' | 'male' | 'female';
  phone: string;
  birthDate: string;
  address: string;
  job: string;
  driver: '' | 'yes' | 'no';
  carType: string;
  carNumber: string;
  carModel: string;
  carYear: string;
  renewalDate: string;
  inflowSource: string;
  referrerName: string;
  insuranceHistory: string;
  accountNumber: string;
  treatmentHistoryNote: string;
  medicationHistoryNote: string;
  isFavorite: boolean;
  smsOptOut: boolean;
};

export type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

export const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: '',
  ssn: '',
  gender: '',
  phone: '',
  birthDate: '',
  address: '',
  job: '',
  driver: '',
  carType: '',
  carNumber: '',
  carModel: '',
  carYear: '',
  renewalDate: '',
  inflowSource: '',
  referrerName: '',
  insuranceHistory: '',
  accountNumber: '',
  treatmentHistoryNote: '',
  medicationHistoryNote: '',
  isFavorite: false,
  smsOptOut: false,
};

function ymd(value: string | null | undefined): string {
  const head = String(value ?? '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : '';
}

export function customerToForm(customer: CustomerRecord): CustomerFormState {
  return {
    name: customer.name,
    ssn: customer.ssn,
    gender: customer.gender ?? '',
    phone: customer.phone,
    birthDate: ymd(customer.birthDate),
    address: customer.address,
    job: customer.job,
    driver: customer.isDriver === true ? 'yes' : customer.isDriver === false ? 'no' : '',
    carType: customer.carType,
    carNumber: customer.carNumber,
    carModel: customer.carModel,
    carYear: customer.carYear,
    renewalDate: ymd(customer.renewalDate),
    inflowSource: customer.inflowSource ?? '',
    referrerName: customer.referrerName ?? '',
    insuranceHistory: customer.notes.insuranceHistory,
    accountNumber: customer.notes.accountNumber,
    treatmentHistoryNote: customer.notes.treatmentHistoryNote,
    medicationHistoryNote: customer.notes.medicationHistoryNote,
    isFavorite: customer.isFavorite,
    smsOptOut: customer.smsOptOut,
  };
}

function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateCustomerForm(form: CustomerFormState): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  if (!form.name.trim()) {
    errors.name = '고객명을 입력해 주세요.';
  }
  const phoneDigits = form.phone.replace(/\D/g, '');
  if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    errors.phone = '연락처는 숫자 10~11자리로 입력해 주세요.';
  }
  const ssnDigits = form.ssn.replace(/\D/g, '');
  if (ssnDigits && ssnDigits.length !== 7 && ssnDigits.length !== 13) {
    errors.ssn = '주민등록번호는 생년월일과 성별번호 또는 전체 번호로 입력해 주세요.';
  }
  if (form.birthDate && !isValidYmd(form.birthDate)) {
    errors.birthDate = '생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.';
  }
  if (form.renewalDate && !isValidYmd(form.renewalDate)) {
    errors.renewalDate = '갱신 예정일을 YYYY-MM-DD 형식으로 입력해 주세요.';
  }
  if (form.carYear && !/^\d{4}$/.test(form.carYear.trim())) {
    errors.carYear = '연식은 4자리 연도로 입력해 주세요.';
  }
  return errors;
}

export function customerFormToPayload(
  form: CustomerFormState,
  existing?: CustomerRecord,
): SaveCustomerPayload {
  return {
    name: form.name.trim(),
    ssn: form.ssn.trim(),
    gender: form.gender || null,
    phone: form.phone.replace(/\D/g, ''),
    birthDate: form.birthDate.trim(),
    address: form.address.trim(),
    job: form.job.trim(),
    isDriver: form.driver === 'yes' ? true : form.driver === 'no' ? false : null,
    carType: form.carType.trim(),
    carNumber: form.carNumber.trim(),
    carModel: form.carModel.trim(),
    carYear: form.carYear.trim(),
    renewalDate: form.renewalDate.trim(),
    inflowSource: form.inflowSource.trim() || null,
    referrerName: form.referrerName.trim() || null,
    notes: {
      items: existing?.notes.items ?? [],
      insuranceHistory: form.insuranceHistory.trim(),
      accountNumber: form.accountNumber.trim(),
      treatmentHistoryNote: form.treatmentHistoryNote.trim(),
      medicationHistoryNote: form.medicationHistoryNote.trim(),
    },
    isFavorite: form.isFavorite,
    smsOptOut: form.smsOptOut,
  };
}
