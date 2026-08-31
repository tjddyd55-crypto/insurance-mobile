export type PaymentCard = {
  id: number;
  customerId: number;
  label: string;
  cardOwnerName: string;
  cardNumber: string | null;
  cardNumberDisplay: string | null;
  cardNumberLast4: string;
  cardExpiryMonth: number;
  cardExpiryYear: number;
  cardExpiry: string;
  isDefault: boolean;
};

export type CardPaymentContract = {
  id: number;
  customerId: number;
  paymentCardId: number | null;
  insuranceCompany: string;
  policyNumber: string | null;
  productName: string | null;
  premiumAmount: number | null;
  paymentDay: number | null;
  memo: string;
  status: 'PENDING' | 'PAUSED';
  monthStatus: 'PENDING' | 'COMPLETED' | 'PAUSED';
  targetMonth: string;
  lastCompletedAt: string | null;
  monthCompletedAt: string | null;
  card: Pick<PaymentCard, 'id' | 'label' | 'cardOwnerName' | 'cardNumberLast4' | 'cardNumber' | 'cardNumberDisplay' | 'cardExpiry' | 'cardExpiryMonth' | 'cardExpiryYear'> | null;
};

export type PaymentCardPayload = {
  label?: string;
  cardOwnerName: string;
  cardNumber?: string;
  cardExpiryMonth: number;
  cardExpiryYear: number;
};

export type ContractPayload = {
  insuranceCompany: string;
  policyNumber?: string | null;
  productName?: string | null;
  premiumAmount?: number | null;
  paymentDay?: number | null;
  paymentCardId?: number | null;
  memo?: string;
  status?: 'PENDING' | 'PAUSED';
};
