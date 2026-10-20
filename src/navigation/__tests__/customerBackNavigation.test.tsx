/**
 * t380u — 고객 리스트 ↔ 상세 뒤로가기 루프 회귀.
 * 실제 (app)/_layout 의 Drawer backBehavior, 실제 customers/_layout(있으면), 실제 고객 back helper 를 쓰고 화면만 stub.
 * DrawerRouter 는 TabRouter(SwitchRouter) 의 backBehavior 를 그대로 쓴다 → jest 에서는 Tabs 뷰로 루트를 그린다.
 */
import { Text } from 'react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs } from 'expo-router';

import {
  goBackFromCustomerDetail,
  navigateToCustomerDetail,
} from '../../features/customers/customerWorkspaceNavigation';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; existsSync: (file: string) => boolean }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const appDir = path.join(__dirname, '..', '..', '..', 'app', '(app)');

const leaf = (name: string) => {
  const Leaf = () => <Text>{name}</Text>;
  Leaf.displayName = `Leaf(${name})`;
  return Leaf;
};
function Detail() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useLocalSearchParams } = require('expo-router') as typeof import('expo-router');
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  return <Text>{`DETAIL_${customerId}`}</Text>;
}

function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const match = source.match(/backBehavior="([a-zA-Z]+)"/);
  return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
}

function customerRoutes(): Record<string, unknown> {
  const layoutFile = path.join(appDir, 'customers', '_layout.tsx');
  const base: Record<string, unknown> = {
    'customers/index': leaf('CUSTOMER_LIST'),
    'customers/[customerId]/index': Detail,
    'customers/[customerId]/files': leaf('CUSTOMER_FILES'),
  };
  if (fs.existsSync(layoutFile)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../../app/(app)/customers/_layout');
    base['customers/_layout'] = { default: mod.default, unstable_settings: mod.unstable_settings };
  }
  return base;
}

const routes = () => ({
  _layout: DrawerLayout,
  index: leaf('HOME'),
  schedule: leaf('SCHEDULE'),
  ...customerRoutes(),
});
/** 홈 + 고객 화면만 있는 Drawer (기기 재현과 같은 route 순서: home, list, detail). */
const minimalRoutes = () => {
  const all = customerRoutes();
  delete all['customers/[customerId]/files'];
  return { _layout: DrawerLayout, index: leaf('HOME'), ...all };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { store } = require('expo-router/build/global-state/router-store');
type NavState = { key: string; type?: string; index: number; routes: { name: string; key: string; params?: object; state?: NavState }[]; history?: { key: string }[] };
/** 루트 아래 첫 번째 tab/drawer navigator 의 route key·history (실패 시 진단용). */
export function drawerTrace(): string {
  const find = (st: NavState | undefined): NavState | undefined =>
    !st ? undefined : st.type === 'tab' || st.type === 'drawer' ? st : st.routes.map((r) => find(r.state)).find(Boolean);
  const nav = find(store.navigationRef.getRootState() as NavState);
  if (!nav) return 'no drawer';
  return `navigator=${nav.key} focused=${nav.routes[nav.index]?.key} history=${(nav.history ?? []).map((h) => h.key).join(' > ')}`;
}

const go = (href: string) => act(() => router.push(href as never));
const back = () => act(() => router.back());
const detailBack = () => act(() => goBackFromCustomerDetail(router));
const expectPath = (pathname: string) => expect((screen as unknown as { getPathname: () => string }).getPathname()).toBe(pathname);

describe('t380u customer back navigation', () => {
  it('list -> detail -> back = list -> back = parent (home), NOT detail again', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/7');
    expectPath('/customers/7');
    detailBack();
    expectPath('/customers');
    if (process.env.NAV_TRACE) console.log('after detail back', drawerTrace());
    back();
    if (process.env.NAV_TRACE) console.log('after 2nd back', drawerTrace());
    expectPath('/');
  });

  it('device repro (home -> list -> detail -> back -> back): list back must not re-open the detail', () => {
    renderRouter(minimalRoutes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/7');
    detailBack();
    expectPath('/customers');
    back();
    expectPath('/');
  });

  it('device repro A/B: A detail -> back -> list -> B detail -> back -> list -> back never shows A or B', () => {
    renderRouter(minimalRoutes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/1');
    detailBack();
    expectPath('/customers');
    go('/customers/2');
    detailBack();
    expectPath('/customers');
    back();
    expectPath('/');
  });

  it('hardware/system back (router.back) on detail behaves the same', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/7');
    back();
    expectPath('/customers');
    back();
    expectPath('/');
  });

  it('A detail -> back -> list -> B detail -> back -> list; A never reappears', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/1');
    detailBack();
    go('/customers/2');
    expectPath('/customers/2');
    detailBack();
    expectPath('/customers');
    back();
    expectPath('/');
  });

  it('list entered from schedule: back from list returns to schedule', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    go('/customers');
    go('/customers/3');
    detailBack();
    back();
    expectPath('/schedule');
  });

  it('sub-route -> back to detail -> back to list -> back to parent, no loop', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers');
    go('/customers/5');
    go('/customers/5/files');
    act(() => navigateToCustomerDetail(router, 5));
    expectPath('/customers/5');
    detailBack();
    expectPath('/customers');
    back();
    expectPath('/');
  });

  it('deep-linked detail without history: back goes to the list (logical parent)', () => {
    renderRouter(routes(), { initialUrl: '/customers/9' });
    detailBack();
    expectPath('/customers');
  });
});
