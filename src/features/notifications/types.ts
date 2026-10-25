export type NotificationType =
  | 'car_expiry'
  | 'insurance_age_date'
  | 'claim_request_received'
  | 'special_date'
  | 'customer_created'
  | 'newsletter_published'
  /** 서버 알림 센터 '상담 신청'(shared/userNotificationCatalog). Native 에는 상담 신청 화면이 없어 탭은 동작하지 않는다. */
  | 'advisor_consultation_lead'
  /** 앱이 모르는 type(레거시·신규). 목록을 깨지 않고 '알림'으로 보인다. */
  | 'other';

export type NotificationView = 'active' | 'confirmed';

export type NotificationRecord = {
  id: string;
  userId: string;
  gaId: number | null;
  teamId: string | null;
  type: NotificationType;
  /** 서버가 보낸 원래 type 문자열. 'other' 일 때 디버깅용. */
  rawType: string;
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
