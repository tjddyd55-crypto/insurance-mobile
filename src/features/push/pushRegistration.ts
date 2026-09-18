import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';

import { ApiError, apiRequest } from '../../api/client';
import { getEnvironmentConfig } from '../../config/environment';
import {
  WORK_NOTIFICATION_CHANNEL_ID,
  workNotificationChannelInput,
} from './notificationChannelConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPayloadData = {
  type?: string;
  customerId?: string;
  claimId?: string;
  newsletterId?: string;
  channel?: string;
  boardSlug?: string;
  route?: string;
  notificationId?: string;
};

type PermissionSnapshot = {
  status: string;
  canAskAgain?: boolean;
};

function asPermissionSnapshot(value: unknown): PermissionSnapshot {
  const v = (value ?? {}) as { status?: string; canAskAgain?: boolean };
  return {
    status: String(v.status ?? ''),
    canAskAgain: v.canAskAgain !== false,
  };
}

function isPushSupportedPlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export async function getOsNotificationPermissionGranted(): Promise<boolean> {
  if (!isPushSupportedPlatform()) return false;
  const current = asPermissionSnapshot(await Notifications.getPermissionsAsync());
  return current.status === 'granted';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isPushSupportedPlatform()) return false;
  const current = asPermissionSnapshot(await Notifications.getPermissionsAsync());
  if (current.status === 'granted') return true;
  if (current.status === 'denied' && current.canAskAgain === false) return false;
  const next = asPermissionSnapshot(await Notifications.requestPermissionsAsync());
  return next.status === 'granted';
}

let permissionPromptShownThisProcess = false;

export function promptNotificationPermissionOnce(): Promise<boolean> {
  if (!isPushSupportedPlatform()) return Promise.resolve(false);
  if (permissionPromptShownThisProcess) {
    return Notifications.getPermissionsAsync().then(
      (p) => asPermissionSnapshot(p).status === 'granted',
    );
  }
  permissionPromptShownThisProcess = true;

  return new Promise((resolve) => {
    void Notifications.getPermissionsAsync().then((raw) => {
      const current = asPermissionSnapshot(raw);
      if (current.status === 'granted') {
        resolve(true);
        return;
      }
      if (current.status === 'denied' && current.canAskAgain === false) {
        Alert.alert(
          '기기 알림이 꺼져 있습니다',
          '업무 알림을 받으려면 설정에서 알림을 허용해 주세요.',
          [
            { text: '닫기', style: 'cancel', onPress: () => resolve(false) },
            {
              text: '설정 열기',
              onPress: () => {
                void Linking.openSettings();
                resolve(false);
              },
            },
          ],
        );
        return;
      }
      Alert.alert(
        '알림을 받아보세요',
        '신규 고객·청구·소식지 등 업무 알림을 바로 알려드립니다.',
        [
          { text: '나중에', style: 'cancel', onPress: () => resolve(false) },
          {
            text: '알림 허용',
            onPress: () => {
              void ensureNotificationPermission().then(resolve);
            },
          },
        ],
      );
    });
  });
}

export async function ensureWorkNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(
    WORK_NOTIFICATION_CHANNEL_ID,
    workNotificationChannelInput(),
  );
}

export async function getNativeDevicePushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    const value = String(token?.data ?? '').trim();
    return value || null;
  } catch {
    return null;
  }
}

export function getInstallationId(): string {
  const env = getEnvironmentConfig();
  const session = String(Constants.sessionId ?? '').trim();
  const buildId = String(Device.osInternalBuildId ?? '').trim();
  const packageId = Platform.OS === 'ios' ? env.iosBundleIdentifier : env.androidPackage;
  return `onefc-native-${packageId}-${buildId || session || 'dev'}`;
}

export function resolvePushPlatform(os: typeof Platform.OS): 'ANDROID' | 'IOS' {
  return os === 'ios' ? 'IOS' : 'ANDROID';
}

export function resolvePushAppPackage(
  os: typeof Platform.OS,
  env: ReturnType<typeof getEnvironmentConfig>,
): string {
  return os === 'ios' ? env.iosBundleIdentifier : env.androidPackage;
}

export function buildPushDeviceRegistrationBody(params: {
  deviceToken: string;
  platform: 'ANDROID' | 'IOS';
  installationId: string;
  appPackage: string;
  appVersion: string;
}) {
  return {
    token: params.deviceToken,
    platform: params.platform,
    installationId: params.installationId,
    appPackage: params.appPackage,
    appVersion: params.appVersion,
  };
}

export async function registerPushDeviceWithServer(params: {
  authToken: string;
  deviceToken: string;
}): Promise<boolean> {
  const authToken = String(params.authToken ?? '').trim();
  const deviceToken = String(params.deviceToken ?? '').trim();
  if (!authToken || !deviceToken) return false;
  const env = getEnvironmentConfig();
  try {
    await apiRequest('/api/push/devices/register', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify(
        buildPushDeviceRegistrationBody({
          deviceToken,
          platform: resolvePushPlatform(Platform.OS),
          installationId: getInstallationId(),
          appPackage: resolvePushAppPackage(Platform.OS, env),
          appVersion: String(Constants.expoConfig?.version ?? ''),
        }),
      ),
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    return false;
  }
}

export async function unregisterPushDeviceWithServer(authToken: string | null): Promise<void> {
  const token = String(authToken ?? '').trim();
  if (!token) return;
  try {
    await apiRequest('/api/push/devices/unregister', {
      method: 'POST',
      token,
      body: JSON.stringify({
        installationId: getInstallationId(),
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function syncPushRegistrationAfterLogin(authToken: string): Promise<void> {
  if (!isPushSupportedPlatform()) return;
  await ensureWorkNotificationChannel();
  const granted = await promptNotificationPermissionOnce();
  if (!granted) return;
  const deviceToken = await getNativeDevicePushToken();
  if (!deviceToken) return;
  await registerPushDeviceWithServer({ authToken, deviceToken });
}

export function openOsNotificationSettings(): void {
  void Linking.openSettings();
}

export function pushPayloadFromNotification(
  content: Notifications.NotificationContent | null | undefined,
): PushPayloadData | null {
  const data = (content?.data ?? {}) as Record<string, unknown>;
  if (!data || typeof data !== 'object') return null;
  return {
    type: data.type != null ? String(data.type) : undefined,
    customerId: data.customerId != null ? String(data.customerId) : undefined,
    claimId: data.claimId != null ? String(data.claimId) : undefined,
    newsletterId: data.newsletterId != null ? String(data.newsletterId) : undefined,
    channel: data.channel != null ? String(data.channel) : undefined,
    boardSlug: data.boardSlug != null ? String(data.boardSlug) : undefined,
    route: data.route != null ? String(data.route) : undefined,
    notificationId: data.notificationId != null ? String(data.notificationId) : undefined,
  };
}
