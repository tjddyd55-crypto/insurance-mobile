/**
 * t378u H3 — 새 화면 뒤로가기 회귀.
 * 실제 (app)/_layout 의 Drawer backBehavior 와 섹션 _layout(Stack) 을 그대로 쓰고, 화면만 stub 으로 바꾼다.
 * DrawerRouter 는 TabRouter(SwitchRouter) 의 backBehavior 를 그대로 쓴다. jest 에서 Drawer 뷰는 reanimated 네이티브가
 * 필요해, 같은 라우터 규칙을 쓰는 Tabs 뷰로 루트를 그린다.
 */
import { Text } from 'react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs } from 'expo-router';

import SharedLayout from '../../../app/(app)/customer-consulting/shared-binders/_layout';
import PersonalLayout from '../../../app/(app)/customer-consulting/personal-binders/_layout';
import LeadsLayout from '../../../app/(app)/consultation-leads/_layout';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; existsSync: (file: string) => boolean }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const appDir = path.join(__dirname, '..', '..', '..', 'app', '(app)');

jest.mock('../../features/coverage-simulator/CoverageCustomerContext', () => ({
  CoverageCustomerProvider: ({ children }: { children: unknown }) => children,
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CoverageLayout = require('../../../app/(app)/customer-consulting/coverage-simulation/_layout').default;

const leaf = (name: string) => {
  const Leaf = () => <Text>{name}</Text>;
  Leaf.displayName = `Leaf(${name})`;
  return Leaf;
};
const leadsSettings = jest.requireActual<{ unstable_settings: object }>('../../../app/(app)/consultation-leads/_layout').unstable_settings;
const sharedSettings = jest.requireActual<{ unstable_settings: object }>('../../../app/(app)/customer-consulting/shared-binders/_layout').unstable_settings;
const personalSettings = jest.requireActual<{ unstable_settings: object }>('../../../app/(app)/customer-consulting/personal-binders/_layout').unstable_settings;

function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const match = source.match(/backBehavior="([a-zA-Z]+)"/);
  return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
}

const routes = {
  _layout: DrawerLayout,
  index: leaf('HOME'),
  'profile/mobile-card': leaf('MOBILE_CARD'),
  schedule: leaf('SCHEDULE'),
  notifications: leaf('NOTIFICATIONS'),
  'consultation-leads/_layout': { default: LeadsLayout, unstable_settings: leadsSettings },
  'consultation-leads/index': leaf('LEADS_LIST'),
  'consultation-leads/[leadId]': leaf('LEAD_DETAIL'),
  'customer-consulting/shared-binders/_layout': { default: SharedLayout, unstable_settings: sharedSettings },
  'customer-consulting/shared-binders/index': leaf('SHARED_LIST'),
  'customer-consulting/shared-binders/[shareId]/index': leaf('SHARED_DETAIL'),
  'customer-consulting/shared-binders/[shareId]/view': leaf('SHARED_VIEWER'),
  'customer-consulting/personal-binders/_layout': { default: PersonalLayout, unstable_settings: personalSettings },
  'customer-consulting/personal-binders/index': leaf('MY_BINDERS'),
  'customer-consulting/personal-binders/[binderId]/view': leaf('MY_VIEWER'),
  'customer-consulting/personal-binders/[binderId]/edit': leaf('MY_EDIT'),
  'customer-consulting/coverage-simulation/_layout': CoverageLayout,
  'customer-consulting/coverage-simulation/index': leaf('SIMULATION'),
};

const LEAD = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const go = (href: string) => act(() => router.push(href as never));
const back = () => act(() => router.back());
const expectScreen = (name: string) => expect(screen.getByText(name)).toBeTruthy();

describe('t378u H3 back navigation', () => {
  it('shared binder section no longer shares a stack with other consulting sections', () => {
    expect(fs.existsSync(path.join(appDir, 'customer-consulting', '_layout.tsx'))).toBe(false);
  });

  it('drawer back returns to the previous screen, not always home', () => {
    renderRouter(routes, { initialUrl: '/' });
    go('/schedule');
    go('/profile/mobile-card');
    back();
    expectScreen('SCHEDULE');
    back();
    expectScreen('HOME');
  });

  it('leads list -> detail -> back -> list', () => {
    renderRouter(routes, { initialUrl: '/' });
    go('/consultation-leads');
    go(`/consultation-leads/${LEAD}`);
    expectScreen('LEAD_DETAIL');
    back();
    expectScreen('LEADS_LIST');
    back();
    expectScreen('HOME');
  });

  it('deep-linked lead detail without history goes back to the leads list', () => {
    renderRouter(routes, { initialUrl: `/consultation-leads/${LEAD}` });
    expectScreen('LEAD_DETAIL');
    back();
    expectScreen('LEADS_LIST');
  });

  it('shared list -> detail -> viewer -> back detail -> back list', () => {
    renderRouter(routes, { initialUrl: '/' });
    go('/customer-consulting/shared-binders');
    go('/customer-consulting/shared-binders/s1');
    go('/customer-consulting/shared-binders/s1/view');
    expectScreen('SHARED_VIEWER');
    back();
    expectScreen('SHARED_DETAIL');
    back();
    expectScreen('SHARED_LIST');
  });

  it('my binder -> viewer -> back my binder, even after visiting shared binders first', () => {
    renderRouter(routes, { initialUrl: '/' });
    go('/customer-consulting/shared-binders');
    go('/customer-consulting/personal-binders');
    go('/customer-consulting/personal-binders/b1/view');
    back();
    expectScreen('MY_BINDERS');
    back();
    expectScreen('SHARED_LIST');
    back();
    expectScreen('HOME');
  });

  it('simulation back never lands on the shared binder list unless it was the previous screen', () => {
    renderRouter(routes, { initialUrl: '/' });
    go('/customer-consulting/shared-binders');
    go('/notifications');
    go('/customer-consulting/coverage-simulation');
    back();
    expectScreen('NOTIFICATIONS');
  });

  it('empty history: viewer opened directly falls back to its section list', () => {
    renderRouter(routes, { initialUrl: '/customer-consulting/personal-binders/b1/view' });
    back();
    expectScreen('MY_BINDERS');
  });
});
