/**
 * t381u — Drawer 형제 화면 + Drawer replace 복귀 루프(t380u 클래스) 회귀/가드.
 * 실제 Drawer backBehavior, 실제 섹션 _layout, 실제 복귀 helper 를 쓰고 화면만 stub.
 * DrawerRouter 는 TabRouter(SwitchRouter) 규칙을 그대로 쓴다 → jest 에서는 Tabs 뷰로 루트를 그린다.
 */
import { Text } from 'react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs } from 'expo-router';

import { returnToSectionParent } from '../sectionNavigation';
import { navigateToCustomerDetail } from '../../features/customers/customerWorkspaceNavigation';
import { COVERAGE_SIMULATION_HOME, coverageTemplateSimulationListPath } from '../../features/coverage-simulator/coverageSimulatorNavigation';

declare const __dirname: string;
type Fs = {
  readFileSync: (file: string, encoding: 'utf8') => string;
  existsSync: (file: string) => boolean;
  readdirSync: (dir: string, options: { withFileTypes: true }) => { name: string; isDirectory: () => boolean }[];
};
const fs = jest.requireActual<Fs>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string; relative: (a: string, b: string) => string }>('path');
const repo = path.join(__dirname, '..', '..', '..');
const appDir = path.join(repo, 'app', '(app)');

jest.mock('../../features/coverage-simulator/CoverageCustomerContext', () => ({
  CoverageCustomerProvider: ({ children }: { children: unknown }) => children,
}));

const leaf = (name: string) => {
  const Leaf = () => <Text>{name}</Text>;
  Leaf.displayName = `Leaf(${name})`;
  return Leaf;
};
function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const match = source.match(/backBehavior="([a-zA-Z]+)"/);
  return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
}
/** 실제 섹션 _layout 이 있으면 그것을 쓴다(없으면 Drawer 형제 = 수정 전 구조). */
function section(dir: string, screens: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...screens };
  if (fs.existsSync(path.join(appDir, ...dir.split('/'), '_layout.tsx'))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(`../../../app/(app)/${dir}/_layout`);
    out[`${dir}/_layout`] = { default: mod.default, unstable_settings: mod.unstable_settings };
  }
  return out;
}
const routes = () => ({
  _layout: DrawerLayout,
  index: leaf('HOME'),
  schedule: leaf('SCHEDULE'),
  notifications: leaf('NOTIFICATIONS'),
  ...section('memo', { 'memo/index': leaf('MEMO_LIST'), 'memo/new': leaf('MEMO_NEW'), 'memo/[memoId]/edit': leaf('MEMO_EDIT') }),
  ...section('consultation-leads', { 'consultation-leads/index': leaf('LEADS'), 'consultation-leads/[leadId]': leaf('LEAD') }),
  ...section('customers', {
    'customers/index': leaf('CUSTOMERS'),
    'customers/[customerId]/index': leaf('CUSTOMER'),
    'customers/[customerId]/consultations': leaf('CUSTOMER_CONSULTATIONS'),
  }),
  ...section('customer-consulting/coverage-simulation', {
    'customer-consulting/coverage-simulation/index': leaf('SIM_HOME'),
    'customer-consulting/coverage-simulation/templates/[templateId]/simulations': leaf('SIM_TEMPLATE'),
  }),
});

const LEAD = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const go = (href: string) => act(() => router.push(href as never));
const back = () => act(() => router.back());
const parent = (href: string) => act(() => returnToSectionParent(router, href));
const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();
const expectPath = (value: string) => expect(pathname()).toBe(value);

describe('memo (MemoFormScreen save/delete → returnToSectionParent("/memo"))', () => {
  it('list -> new -> save -> list -> back = parent, not the form', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/memo');
    go('/memo/new');
    parent('/memo');
    expectPath('/memo');
    back();
    expectPath('/');
  });

  it('A edit -> save -> list -> B edit -> delete -> list -> back = parent; A/B never reappear', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    go('/memo');
    go('/memo/a/edit');
    parent('/memo');
    go('/memo/b/edit');
    parent('/memo');
    expectPath('/memo');
    back();
    expectPath('/schedule');
  });

  it('cancel (router.back) from the form returns to the list', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/memo');
    go('/memo/a/edit');
    back();
    expectPath('/memo');
    back();
    expectPath('/');
  });
});

describe('coverage simulation (editor/template back → returnToSectionParent)', () => {
  it('home -> template list -> back to home -> back = previous screen (no duplicate home)', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/notifications');
    go(COVERAGE_SIMULATION_HOME);
    go(coverageTemplateSimulationListPath('t1'));
    parent(COVERAGE_SIMULATION_HOME);
    expectPath(COVERAGE_SIMULATION_HOME);
    back();
    expectPath('/notifications');
  });
});

describe('missing H3 paths', () => {
  // 다른 메뉴에서 push 로 연 상세는 그 섹션 Stack 에 상세만 올라간다 → back = 직전 화면(알림).
  it('notifications -> lead detail -> back = notifications (previous screen) -> back = home', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/notifications');
    act(() => router.push({ pathname: '/consultation-leads/[leadId]', params: { leadId: LEAD } } as never));
    expectPath(`/consultation-leads/${LEAD}`);
    back();
    expectPath('/notifications');
    back();
    expectPath('/');
  });

  it('notifications -> lead detail -> back -> leads list from menu -> detail -> back = list (no stale detail)', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/notifications');
    act(() => router.push({ pathname: '/consultation-leads/[leadId]', params: { leadId: LEAD } } as never));
    back();
    go('/consultation-leads');
    expectPath('/consultation-leads');
    go(`/consultation-leads/${LEAD}`);
    back();
    expectPath('/consultation-leads');
  });

  it('schedule -> 고객 보기 (customer consultations) -> parent = customer -> list -> back = schedule, no loop', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    go('/customers/7/consultations');
    act(() => navigateToCustomerDetail(router, 7));
    expectPath('/customers/7');
    parent('/customers');
    expectPath('/customers');
    back();
    expectPath('/schedule');
    back();
    expectPath('/');
  });
});

/* ---------- guards ---------- */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('navigation convention guards', () => {
  it('every drawer section with a list plus detail/form routes has its own Stack _layout', () => {
    const missing: string[] = [];
    const visit = (dir: string) => {
      const files = walk(dir).map((file) => path.relative(dir, file).replace(/\\/g, '/'));
      const hasLayout = files.includes('_layout.tsx');
      const hasList = files.includes('index.tsx');
      const hasDetailOrForm = files.some((file) => /(^|\/)\[[^\]]+\]|(^|\/)(new|edit)\.tsx$/.test(file));
      if (hasList && hasDetailOrForm && !hasLayout) missing.push(path.relative(appDir, dir));
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !hasLayout) visit(path.join(dir, entry.name));
      }
    };
    for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(appDir, entry.name));
    }
    expect(missing).toEqual([]);
  });

  it('section stacks start at their list (initialRouteName index) so direct-open detail backs to the list', () => {
    const layouts = walk(appDir).filter((file) => file.endsWith('_layout.tsx') && file !== path.join(appDir, '_layout.tsx'));
    const wrong = layouts.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /<Stack\b/.test(source) && !/initialRouteName:\s*'index'/.test(source);
    });
    expect(wrong.map((file) => path.relative(appDir, file))).toEqual([]);
  });

  it('no screen returns to a parent with router.replace (use returnToSectionParent); only auth/access gates and no-history fallbacks may replace', () => {
    const allowed: Record<string, RegExp> = {
      // 로그인/로그아웃·접근 제한 게이트: 앱 전체를 다른 영역으로 보낸다(복귀가 아님).
      'app/_layout.tsx': /router\.replace\('\/\((auth|app)\)/,
      'app/(auth)/password-reset.tsx': /router\.replace\('\/\(auth\)\/login'\)/,
      'src/navigation/AppDrawerContent.tsx': /router\.replace\('\/\(auth\)\/login'\)/,
      'src/features/profile/ProfileScreen.tsx': /router\.replace\('\/\(auth\)\/login'\)/,
      'src/navigation/SubscriptionAccessGate.tsx': /router\.replace\(/,
      'src/navigation/PublicAccountAccessGate.tsx': /router\.replace\(/,
      'src/features/billing/BillingEntitlementGate.tsx': /router\.replace\(/,
      // 기록이 없을 때만(canGoBack false) 부모로 바꾼다.
      'src/features/consultation-leads/ConsultationLeadDetailScreen.tsx': /canGoBack\(\) \? router\.back\(\) : router\.replace/,
      'src/features/shared-binders/SharedBinderDetailScreen.tsx': /canGoBack\(\) \? router\.back\(\) : router\.replace/,
      'src/features/mobile-card/MobileCardWebViewScreen.tsx': /else router\.replace\('\/'\)/,
      // 할 일 Stack 위가 아닐 때(딥링크)만 목록으로 바꾼다.
      'src/features/todos/todoNavigation.ts': /router\.replace\(TODO_LIST_HREF\)/,
    };
    const offenders: string[] = [];
    for (const file of [...walk(path.join(repo, 'src')), ...walk(path.join(repo, 'app'))]) {
      const rel = path.relative(repo, file).replace(/\\/g, '/');
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!/router\.replace\(|<Redirect\b/.test(line)) return;
        if (/^\s*(\*|\/\/)/.test(line)) return;
        if (/<Redirect\b/.test(line) && (rel === 'app/index.tsx' || rel === 'app/(app)/team/manage/index.tsx')) return;
        const rule = allowed[rel];
        if (rule && rule.test(line)) return;
        offenders.push(`${rel}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
