import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BillingRoute from '../../../../app/(app)/billing';
import { DesignSystemProvider } from '../../../design-system';
import { SubscriptionAccessGate } from '../../../navigation/SubscriptionAccessGate';
import { ProfileScreen } from '../../profile/ProfileScreen';
import { profileQueryKeys } from '../../profile/queryKeys';
import { BillingEntitlementGate } from '../BillingEntitlementGate';
import { billingCheckoutSummaryQueryKey } from '../billingApi';
import { redeemNativeCoupon } from '../redeemNativeCoupon';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockPathname = '/profile';
let mockAccess: string | undefined;
let mockExpired = false;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({ access: mockAccess }),
  Redirect: ({ href }: { href: string }) => {
    mockRouter.replace(href);
    return null;
  },
}));
jest.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({
    token: null,
    user: {
      role: 'USER',
      subscription: { effectiveStatus: mockExpired ? 'EXPIRED' : 'ACTIVE' },
    },
  }),
}));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../profile/GoogleIntegrationSection', () => ({
  GOOGLE_INTEGRATION_COPY: { title: 'Google 연동' },
  GoogleIntegrationSection: () => null,
}));
jest.mock('../redeemNativeCoupon', () => ({ redeemNativeCoupon: jest.fn() }));

const billingEnv = {
  EXPO_PUBLIC_INSURANCE_BILLING_ENABLED: 'true',
  EXPO_PUBLIC_INSURANCE_BILLING_ENFORCE_ACCESS: 'true',
  EXPO_PUBLIC_FREE_LAUNCH_HIDE_BILLING_UI: 'false',
};
const originalEnv = { ...process.env };
beforeEach(() => {
  mockPathname = '/profile';
  mockAccess = undefined;
  mockExpired = false;
  jest.clearAllMocks();
  Object.assign(process.env, billingEnv);
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const name of Object.keys(billingEnv)) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

function renderScreen(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  client.setQueryData(profileQueryKeys.current, {
    displayName: '테스트 사용자',
    username: 'user',
    phoneNumber: '',
    role: 'USER',
  });
  client.setQueryData(billingCheckoutSummaryQueryKey, { subscriptionStatus: 'expired' });

  return render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}>
      <DesignSystemProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

const managedMessage = '계정 이용은 소속 또는 관리자가 관리합니다.';
const purchaseCopy = /쿠폰|결제|구독|요금|이용권|유료|웹에서/;

describe.each(['ios', 'android'] as const)('%s billing surfaces', (platform) => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', platform));

  test('profile applies the platform policy to its service description and coupon button', () => {
    mockAccess = 'managed';
    const ui = renderScreen(<ProfileScreen />);
    if (platform === 'ios') {
      expect(ui.getByText(managedMessage)).toBeOnTheScreen();
      expect(ui.getByText('저장공간, 문의 내역으로 이동합니다.')).toBeOnTheScreen();
      expect(ui.queryByText(purchaseCopy)).toBeNull();
    } else {
      expect(ui.queryByText(managedMessage)).toBeNull();
      expect(ui.getByText('저장공간, 쿠폰, 문의 내역으로 이동합니다.')).toBeOnTheScreen();
      fireEvent.press(ui.getByRole('button', { name: '쿠폰 적용' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/billing');
    }
  });

  test('opening the billing route redirects iOS and mounts the form on Android', async () => {
    const ui = renderScreen(<BillingRoute />);
    if (platform === 'ios') {
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile');
      expect(ui.queryByLabelText('쿠폰 코드')).toBeNull();
      expect(ui.queryByText(purchaseCopy)).toBeNull();
      expect(redeemNativeCoupon).not.toHaveBeenCalled();
    } else {
      expect(mockRouter.replace).not.toHaveBeenCalled();
      jest.mocked(redeemNativeCoupon).mockResolvedValue({ ok: true });
      fireEvent.changeText(ui.getByLabelText('쿠폰 코드'), 'CODE');
      fireEvent.press(ui.getByRole('button', { name: '적용' }));
      expect(await ui.findByText('쿠폰이 적용되었습니다.')).toBeOnTheScreen();
      expect(redeemNativeCoupon).toHaveBeenCalledWith(null, 'CODE', 'insurance_basic', 'monthly');
    }
  });

  test('entitlement gate sends blocked users to the platform-specific destination', () => {
    mockPathname = '/customers';
    const ui = renderScreen(<BillingEntitlementGate><Text>고객관리</Text></BillingEntitlementGate>);
    if (platform === 'ios') {
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile?access=managed');
      expect(ui.getByText(managedMessage)).toBeOnTheScreen();
      expect(ui.queryByText(purchaseCopy)).toBeNull();
      expect(ui.queryByText('고객관리')).toBeNull();
    } else {
      expect(mockRouter.replace).toHaveBeenCalledWith('/billing');
      expect(ui.getByText('고객관리')).toBeOnTheScreen();
    }
  });

  test('expired access to billing redirects iOS and remains available on Android', () => {
    mockExpired = true;
    mockPathname = '/billing';
    const ui = renderScreen(<SubscriptionAccessGate><BillingRoute /></SubscriptionAccessGate>);
    if (platform === 'ios') {
      expect(mockRouter.replace).toHaveBeenCalledWith('/profile');
      expect(ui.getByText(managedMessage)).toBeOnTheScreen();
      expect(ui.queryByText(purchaseCopy)).toBeNull();
      expect(ui.queryByLabelText('쿠폰 코드')).toBeNull();
    } else {
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(ui.getByLabelText('쿠폰 코드')).toBeOnTheScreen();
    }
  });
});
