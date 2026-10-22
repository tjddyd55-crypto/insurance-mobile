import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { DeviceContactsPermissionPanel } from '../DeviceContactsPermissionPanel';
import {
  CONTACTS_EMPTY,
  CONTACTS_PERMISSION_ALLOW_LABEL,
  CONTACTS_PERMISSION_EXPLANATION,
  CONTACTS_PERMISSION_REQUIRED,
  CONTACTS_PERMISSION_SETTINGS_LABEL,
  CONTACTS_UNREGISTERED_EMPTY,
  contactsPermissionPanelModel,
  deviceContactEmptyMessage,
  resolveContactsPermissionPhase,
} from '../deviceContactPermission';

function renderPanel(phase: 'undetermined' | 'denied' | 'blocked' | 'granted', onRequest = jest.fn(), onSettings = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <DesignSystemProvider>
        <DeviceContactsPermissionPanel phase={phase} onRequestAccess={onRequest} onOpenSettings={onSettings} />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

describe('device contact permission states', () => {
  it('resolves the four permission states', () => {
    expect(resolveContactsPermissionPhase({ status: 'undetermined', granted: false, canAskAgain: true })).toBe('undetermined');
    expect(resolveContactsPermissionPhase({ status: 'granted', granted: true, canAskAgain: true })).toBe('granted');
    expect(resolveContactsPermissionPhase({ status: 'denied', granted: false, canAskAgain: true })).toBe('denied');
    expect(resolveContactsPermissionPhase({ status: 'denied', granted: false, canAskAgain: false })).toBe('blocked');
  });

  it('shows the explanation and the allow button before a request', () => {
    const onRequest = jest.fn();
    const screen = renderPanel('undetermined', onRequest);
    expect(screen.getByText(CONTACTS_PERMISSION_EXPLANATION)).toBeTruthy();
    fireEvent.press(screen.getByText(CONTACTS_PERMISSION_ALLOW_LABEL));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps a safe denied state that can ask again', () => {
    const screen = renderPanel('denied');
    expect(screen.getByText(CONTACTS_PERMISSION_REQUIRED)).toBeTruthy();
    expect(screen.getByText(CONTACTS_PERMISSION_ALLOW_LABEL)).toBeTruthy();
  });

  it('sends a permanent denial to system settings', () => {
    const onSettings = jest.fn();
    const screen = renderPanel('blocked', jest.fn(), onSettings);
    fireEvent.press(screen.getByText(CONTACTS_PERMISSION_SETTINGS_LABEL));
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(contactsPermissionPanelModel('granted')).toBeNull();
  });

  it('uses the empty copy for no contacts and no unregistered contacts', () => {
    expect(deviceContactEmptyMessage({
      filter: 'unregistered',
      query: '',
      totalContacts: 0,
      visibleCount: 0,
    })).toBe(CONTACTS_EMPTY);
    expect(deviceContactEmptyMessage({
      filter: 'unregistered',
      query: '',
      totalContacts: 4,
      visibleCount: 0,
    })).toBe(CONTACTS_UNREGISTERED_EMPTY);
    expect(CONTACTS_PERMISSION_REQUIRED).toBe('연락처 권한이 필요합니다');
  });
});
