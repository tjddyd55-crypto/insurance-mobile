export type ContactsPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unsupported';

export type ContactsPermissionSnapshot = {
  status: ContactsPermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
};

/** 권한 안내 4상태 + 권한을 확인하는 동안 + 웹. */
export type ContactsPermissionPhase =
  | 'checking'
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported';

export const CONTACTS_PERMISSION_EXPLANATION =
  '휴대폰 연락처를 ONE FC에서 확인하려면 연락처 접근 권한이 필요합니다.';

export const CONTACTS_PERMISSION_ALLOW_LABEL = '연락처 권한 허용';

export const CONTACTS_PERMISSION_SETTINGS_LABEL = '설정에서 권한 허용';

export const CONTACTS_PERMISSION_REQUIRED = '연락처 권한이 필요합니다';

export const CONTACTS_EMPTY = '휴대폰에 저장된 연락처가 없습니다';

export const CONTACTS_UNREGISTERED_EMPTY = '미등록 연락처가 없습니다';

export const CONTACTS_SEARCH_EMPTY = '검색된 연락처가 없습니다.';

export function resolveContactsPermissionPhase(
  snapshot: ContactsPermissionSnapshot,
): ContactsPermissionPhase {
  if (snapshot.status === 'unsupported') {
    return 'unsupported';
  }
  if (snapshot.granted || snapshot.status === 'granted') {
    return 'granted';
  }
  if (snapshot.status === 'undetermined') {
    return 'undetermined';
  }
  if (!snapshot.canAskAgain) {
    return 'blocked';
  }
  return 'denied';
}

export type ContactsPermissionPanelModel = {
  title: string;
  action: 'request' | 'settings' | null;
  actionLabel: string;
};

/** 허용된 상태에서는 안내 패널을 그리지 않는다. */
export function contactsPermissionPanelModel(
  phase: ContactsPermissionPhase,
): ContactsPermissionPanelModel | null {
  if (phase === 'checking' || phase === 'granted') {
    return null;
  }
  if (phase === 'undetermined') {
    return {
      title: CONTACTS_PERMISSION_EXPLANATION,
      action: 'request',
      actionLabel: CONTACTS_PERMISSION_ALLOW_LABEL,
    };
  }
  if (phase === 'blocked') {
    return {
      title: CONTACTS_PERMISSION_REQUIRED,
      action: 'settings',
      actionLabel: CONTACTS_PERMISSION_SETTINGS_LABEL,
    };
  }
  if (phase === 'unsupported') {
    return {
      title: CONTACTS_PERMISSION_REQUIRED,
      action: null,
      actionLabel: '',
    };
  }
  return {
    title: CONTACTS_PERMISSION_REQUIRED,
    action: 'request',
    actionLabel: CONTACTS_PERMISSION_ALLOW_LABEL,
  };
}

export function deviceContactEmptyMessage(input: {
  filter: 'all' | 'unregistered' | 'customer' | 'duplicate';
  query: string;
  totalContacts: number;
  visibleCount: number;
}): string | null {
  if (input.visibleCount > 0) {
    return null;
  }
  if (input.totalContacts === 0) {
    return CONTACTS_EMPTY;
  }
  if (input.filter === 'unregistered' && !input.query.trim()) {
    return CONTACTS_UNREGISTERED_EMPTY;
  }
  if (input.query.trim()) {
    return CONTACTS_SEARCH_EMPTY;
  }
  return CONTACTS_SEARCH_EMPTY;
}
