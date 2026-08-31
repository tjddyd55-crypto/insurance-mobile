export type NotificationType =
  | 'car_expiry'
  | 'insurance_age_date'
  | 'claim_request_received'
  | 'special_date';

export type NotificationView = 'active' | 'confirmed';

export type NotificationRecord = {
  id: string;
  userId: string;
  gaId: number | null;
  teamId: string | null;
  type: NotificationType;
  referenceId: string | null;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  customerId: number | null;
  customerName: string | null;
  targetDate: string | null;
  claimRequestId: number | null;
  specialDateId: number | null;
  createdAt: string | null;
  confirmedAt: string | null;
};

export type WindowedAlertSetting = { enabled: boolean; daysBefore: number };
export type UserAlertSettings = {
  insuranceAge: WindowedAlertSetting;
  carExpiry: WindowedAlertSetting;
  specialDate: WindowedAlertSetting;
  claimRequest: { enabled: boolean };
};

export type NotificationListResult = {
  notifications: NotificationRecord[];
  settings: UserAlertSettings;
};
