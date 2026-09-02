export type NotificationType =
  | 'car_expiry'
  | 'insurance_age_date'
  | 'claim_request_received'
  | 'special_date'
  | 'customer_created';

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
export type ToggleAlertSetting = { enabled: boolean };
export type UserAlertSettings = {
  appPush: ToggleAlertSetting;
  newCustomer: ToggleAlertSetting;
  customerAppFile: ToggleAlertSetting;
  workAlert: ToggleAlertSetting;
  insuranceAge: WindowedAlertSetting;
  carExpiry: WindowedAlertSetting;
  specialDate: WindowedAlertSetting;
  claimRequest: ToggleAlertSetting;
};

export type NotificationListResult = {
  notifications: NotificationRecord[];
  settings: UserAlertSettings;
};
