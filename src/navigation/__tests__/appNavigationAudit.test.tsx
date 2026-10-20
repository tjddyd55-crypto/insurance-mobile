/**
 * t384u — 앱 전체 네비게이션 감사(영역별 표준 흐름 + 진입(push/딥링크) 흐름).
 * 실제 Drawer backBehavior, 실제 섹션 _layout, 실제 복귀 helper 를 쓰고 화면만 stub.
 * DrawerRouter 는 TabRouter(SwitchRouter) 규칙을 그대로 쓴다 → jest 에서는 Tabs 뷰로 루트를 그린다.
 * 표준 흐름: 이전 화면 → 목록 → 상세 → back = 목록 → back = 이전 화면.
 */
import { Pressable, Text } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs, useNavigation, useRouter } from 'expo-router';

import { returnToSectionParent } from '../sectionNavigation';
import { goBackFromCustomerDetail, navigateToCustomerDetail } from '../../features/customers/customerWorkspaceNavigation';
import { returnToTodoList } from '../../features/todos/todoNavigation';
import { resolvePushDeepLink } from '../../features/push/pushDeepLink';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; existsSync: (file: string) => boolean }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const appDir = path.join(__dirname, '..', '..', '..', 'app', '(app)');

jest.mock('../../features/coverage-simulator/CoverageCustomerContext', () => ({
  CoverageCustomerProvider: ({ children }: { children: unknown }) => children,
}));

const leaf = (name: string) => {
  const Leaf = () => <Text>{name}</Text>;
  Leaf.displayName = `Leaf(${name})`;
  return Leaf;
};
/** 할 일 폼: 실제 returnToTodoList(navigation, router) 를 버튼으로 호출한다. */
function TodoForm() {
  const navigation = useNavigation();
  const appRouter = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => returnToTodoList(navigation as never, appRouter)}>
      <Text>TODO_RETURN</Text>
    </Pressable>
  );
}
function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const match = source.match(/backBehavior="([a-zA-Z]+)"/);
  return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
}
function section(dir: string, screens: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...screens };
  if (fs.existsSync(path.join(appDir, ...dir.split('/'), '_layout.tsx'))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(`../../../app/(app)/${dir}/_layout`);
    out[`${dir}/_layout`] = { default: mod.default, unstable_settings: mod.unstable_settings };
  }
  return out;
}

/** 실제 app/(app) 라우트 파일 구조(영역별) — 화면만 stub. */
const routes = () => ({
  _layout: DrawerLayout,
  index: leaf('HOME'),
  'schedule/index': leaf('SCHEDULE'),
  'notifications/index': leaf('NOTIFICATIONS'),
  'notifications/settings': leaf('NOTIFICATION_SETTINGS'),
  'profile/index': leaf('PROFILE'),
  'claim-requests/index': leaf('CLAIMS'),
  'claim-requests/news/index': leaf('CLAIM_NEWS'),
  'team/members/index': leaf('TEAM_MEMBERS'),
  'team/posts/index': leaf('TEAM_POSTS'),
  'insurance/contacts/index': leaf('INSURANCE_CONTACTS'),
  'portal/newsletters/index': leaf('NEWSLETTERS'),
  'portal/boards/[slug]/index': leaf('BOARD'),
  ...section('customers', {
    'customers/index': leaf('CUSTOMERS'),
    'customers/new': leaf('CUSTOMER_NEW'),
    'customers/[customerId]/index': leaf('CUSTOMER'),
    'customers/[customerId]/edit': leaf('CUSTOMER_EDIT'),
    'customers/[customerId]/claim-requests': leaf('CUSTOMER_CLAIMS'),
    'customers/[customerId]/consultations': leaf('CUSTOMER_CONSULTATIONS'),
  }),
  ...section('memo', { 'memo/index': leaf('MEMOS'), 'memo/new': leaf('MEMO_NEW'), 'memo/[memoId]/edit': leaf('MEMO_EDIT') }),
  ...section('todos', { 'todos/index': leaf('TODOS'), 'todos/new': TodoForm, 'todos/[todoId]/edit': TodoForm }),
  ...section('consultation-leads', { 'consultation-leads/index': leaf('LEADS'), 'consultation-leads/[leadId]': leaf('LEAD') }),
  ...section('customer-consulting/shared-binders', {
    'customer-consulting/shared-binders/index': leaf('SHARED'),
    'customer-consulting/shared-binders/[shareId]/index': leaf('SHARED_DETAIL'),
    'customer-consulting/shared-binders/[shareId]/view': leaf('SHARED_VIEW'),
  }),
  ...section('customer-consulting/personal-binders', {
    'customer-consulting/personal-binders/index': leaf('BINDERS'),
    'customer-consulting/personal-binders/[binderId]/view': leaf('BINDER_VIEW'),
    'customer-consulting/personal-binders/[binderId]/edit': leaf('BINDER_EDIT'),
  }),
  ...section('customer-consulting/coverage-simulation', {
    'customer-consulting/coverage-simulation/index': leaf('SIM'),
    'customer-consulting/coverage-simulation/disease/[diseaseType]': leaf('SIM_DISEASE'),
    'customer-consulting/coverage-simulation/scenarios/[scenarioId]/index': leaf('SIM_EDITOR'),
  }),
});

const LEAD = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const go = (href: string | object) => act(() => router.push(href as never));
const back = () => act(() => router.back());
const parent = (href: string) => act(() => returnToSectionParent(router, href));
const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();
const at = (value: string) => expect(pathname()).toBe(value);
const start = (from = '/schedule') => {
  renderRouter(routes(), { initialUrl: '/' });
  if (from !== '/') go(from);
};

/** 표준 흐름: from → list → detail → (돌아가기) = list → back = from. */
function canonical(from: string, list: string, detail: string, returnToList: () => void) {
  start(from);
  go(list);
  go(detail);
  at(detail);
  returnToList();
  at(list);
  back();
  at(from);
}

describe('customers', () => {
  it('canonical: schedule -> list -> detail -> back -> list -> back = schedule', () =>
    canonical('/schedule', '/customers', '/customers/7', () => act(() => goBackFromCustomerDetail(router))));
  it('canonical with system back (router.back)', () => canonical('/schedule', '/customers', '/customers/7', back));
  it('A/B repeat never re-shows A or B', () => {
    start('/');
    go('/customers');
    go('/customers/1');
    act(() => goBackFromCustomerDetail(router));
    go('/customers/2');
    act(() => goBackFromCustomerDetail(router));
    at('/customers');
    back();
    at('/');
  });
  it('new -> save (navigateToCustomerDetail) -> detail -> back = list -> back = from', () => {
    start('/schedule');
    go('/customers');
    go('/customers/new');
    act(() => navigateToCustomerDetail(router, 9));
    at('/customers/9');
    act(() => goBackFromCustomerDetail(router));
    at('/customers');
    back();
    at('/schedule');
  });
  it('edit -> save/cancel returns to the existing detail (pop), then list, then from', () => {
    start('/schedule');
    go('/customers');
    go('/customers/7');
    go('/customers/7/edit');
    act(() => navigateToCustomerDetail(router, 7));
    at('/customers/7');
    back();
    at('/customers');
    back();
    at('/schedule');
  });
  it('push deep link (customer_created) -> detail -> parent = list -> back = notifications', () => {
    start('/notifications');
    go(resolvePushDeepLink({ type: 'customer_created', customerId: '7' } as never));
    at('/customers/7');
    act(() => goBackFromCustomerDetail(router));
    at('/customers');
    back();
    at('/notifications');
  });
});

describe('claims', () => {
  it('drawer claims (in-screen detail state, no detail route): from -> claims -> back = from', () => {
    start('/schedule');
    go('/claim-requests');
    back();
    at('/schedule');
  });
  it('notification claim -> customer claims -> customer detail -> list -> back = notifications', () => {
    start('/notifications');
    go({ pathname: '/customers/[customerId]/claim-requests', params: { customerId: '7', claimId: '3' } });
    at('/customers/7/claim-requests');
    act(() => navigateToCustomerDetail(router, 7));
    at('/customers/7');
    act(() => goBackFromCustomerDetail(router));
    at('/customers');
    back();
    at('/notifications');
  });
  it("'고객 보기' from customer claims: back returns to claims, then the original detail, then list (no loop)", () => {
    start('/schedule');
    go('/customers');
    go('/customers/7');
    go('/customers/7/claim-requests');
    go('/customers/7');
    at('/customers/7');
    back();
    at('/customers/7/claim-requests');
    act(() => navigateToCustomerDetail(router, 7));
    at('/customers/7');
    back();
    at('/customers');
    back();
    at('/schedule');
  });
});

describe('memo', () => {
  it('canonical: list -> edit -> save -> list -> back = from', () =>
    canonical('/schedule', '/memo', '/memo/a/edit', () => parent('/memo')));
  it('canonical: list -> new -> cancel (back) -> list -> back = from', () => canonical('/schedule', '/memo', '/memo/new', back));
  it('A/B edit repeat', () => {
    start('/');
    go('/memo');
    go('/memo/a/edit');
    parent('/memo');
    go('/memo/b/edit');
    parent('/memo');
    back();
    at('/');
  });
});

describe('todos', () => {
  it('canonical: list -> edit -> returnToTodoList -> list -> back = from', () => {
    start('/schedule');
    go('/todos');
    go('/todos/1/edit');
    fireEvent.press(screen.getByText('TODO_RETURN'));
    at('/todos');
    back();
    at('/schedule');
  });
  it('canonical with system back', () => canonical('/schedule', '/todos', '/todos/new', back));
});

describe('consultation-leads', () => {
  it('canonical: from -> list -> detail -> back -> list -> back = from', () =>
    canonical('/schedule', '/consultation-leads', `/consultation-leads/${LEAD}`, back));
  it('notification -> lead detail -> back = notifications (previous), never another section', () => {
    start('/notifications');
    go({ pathname: '/consultation-leads/[leadId]', params: { leadId: LEAD } });
    back();
    at('/notifications');
  });
  it('push deep link (advisor_consultation_lead) -> detail -> back = previous screen', () => {
    start('/schedule');
    go(resolvePushDeepLink({ type: 'advisor_consultation_lead', leadId: LEAD } as never));
    at(`/consultation-leads/${LEAD}`);
    back();
    at('/schedule');
  });
  it('cold-start deep link -> detail -> back = leads list (logical parent)', () => {
    renderRouter(routes(), { initialUrl: `/consultation-leads/${LEAD}` });
    back();
    at('/consultation-leads');
  });
});

describe('shared binders', () => {
  it('canonical: from -> list -> detail -> viewer -> back -> detail -> back -> list -> back = from', () => {
    start('/schedule');
    go('/customer-consulting/shared-binders');
    go('/customer-consulting/shared-binders/s1');
    go('/customer-consulting/shared-binders/s1/view');
    back();
    at('/customer-consulting/shared-binders/s1');
    back();
    at('/customer-consulting/shared-binders');
    back();
    at('/schedule');
  });
  it('cold-start deep link detail -> back = shared list (its own parent)', () => {
    renderRouter(routes(), { initialUrl: '/customer-consulting/shared-binders/s1' });
    back();
    at('/customer-consulting/shared-binders');
  });
});

describe('personal binders', () => {
  it('canonical: from -> list -> viewer -> back -> list -> back = from', () =>
    canonical('/schedule', '/customer-consulting/personal-binders', '/customer-consulting/personal-binders/b1/view', back));
  it('list -> viewer -> edit -> back -> viewer -> back -> list (never shared binder list)', () => {
    start('/customer-consulting/shared-binders');
    go('/customer-consulting/personal-binders');
    go('/customer-consulting/personal-binders/b1/view');
    go('/customer-consulting/personal-binders/b1/edit');
    back();
    at('/customer-consulting/personal-binders/b1/view');
    back();
    at('/customer-consulting/personal-binders');
    back();
    at('/customer-consulting/shared-binders');
  });
  it('shared import -> my viewer (push from another section) -> back = shared (previous)', () => {
    start('/');
    go('/customer-consulting/shared-binders');
    go('/customer-consulting/shared-binders/s1');
    go('/customer-consulting/personal-binders/b9/view');
    back();
    at('/customer-consulting/shared-binders/s1');
  });
});

describe('coverage simulation', () => {
  it('canonical: from -> home -> disease list -> back -> home -> back = from', () =>
    canonical('/schedule', '/customer-consulting/coverage-simulation', '/customer-consulting/coverage-simulation/disease/cancer', back));
  it('editor -> parent (returnToSectionParent) -> home -> back = from (no duplicate home)', () =>
    canonical('/schedule', '/customer-consulting/coverage-simulation', '/customer-consulting/coverage-simulation/scenarios/x', () =>
      parent('/customer-consulting/coverage-simulation')));
});

describe('single-screen areas (detail is in-screen state / modal, not a route)', () => {
  it.each([
    ['schedule (event detail modal)', '/schedule'],
    ['notifications', '/notifications'],
    ['team members', '/team/members'],
    ['team posts (post form modal)', '/team/posts'],
    ['insurance contacts', '/insurance/contacts'],
    ['claim news', '/claim-requests/news'],
  ])('%s: from -> screen -> back = from', (_label, href) => {
    start('/profile');
    go(href);
    back();
    at('/profile');
  });
  it('notifications -> settings -> back = notifications -> back = from', () => {
    start('/schedule');
    go('/notifications');
    go('/notifications/settings');
    back();
    at('/notifications');
    back();
    at('/schedule');
  });
  it('push newsletter / board deep link -> back = previous screen', () => {
    start('/schedule');
    go(resolvePushDeepLink({ type: 'newsletter_published', newsletterId: 'n1' } as never));
    back();
    at('/schedule');
  });
});
