export type CustomerGender = 'male' | 'female' | null;

export type CustomerNote = {
  id: string;
  content: string;
  createdAt: string;
};

export type CustomerNotesBag = {
  items: CustomerNote[];
  insuranceHistory: string;
  accountNumber: string;
  treatmentHistoryNote: string;
  medicationHistoryNote: string;
};

export type CustomerRecord = {
  id: number;
  userId: string;
  name: string;
  customerCode?: string | null;
  ssn: string;
  gender: CustomerGender;
  insuranceAge: number | null;
  birthDate?: string | null;
  nextAgeDate: string | null;
  isDriver: boolean | null;
  carType: string;
  notes: CustomerNotesBag;
  phone: string;
  phoneNumber?: string;
  carrier: string;
  address: string;
  height: string;
  weight: string;
  job: string;
  driving: string;
  medical: string;
  carNumber: string;
  carModel: string;
  carYear: string;
  renewalDate: string;
  lastConsultDate?: string | null;
  lastConsultationAt?: string | null;
  lastConsultationMemo?: string | null;
  lastConsultationSummary?: string | null;
  consultationCount?: number;
  hasConsultation?: boolean;
  inflowSource?: string | null;
  referrerName?: string | null;
  nextContactDate?: string | null;
  followUpStatus?: string | null;
  contactResult?: string | null;
  followUpNotePreview?: string | null;
  overdueFollowUp?: boolean;
  todayFollowUp?: boolean;
  isFavorite: boolean;
  smsOptOut: boolean;
  createdAt: string;
};

export type ListCustomersResult = {
  customers: CustomerRecord[];
  total: number;
};
