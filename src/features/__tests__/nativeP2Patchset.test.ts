/** Guard: ONE FC Native 최종 P2(P2-1~P2-5). */
/* eslint-disable @typescript-eslint/no-require-imports */
import { resolvePendingLinkItem } from '../schedule/scheduleLinkParams';
import { showTodoLoadError } from '../todos/todoLoadError';

const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;
const root = path.join(__dirname, '..', '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), 'utf8');
const kt = (name: string) => read('modules', 'onefc-home-widgets', 'android', 'src', 'main', 'java', 'expo', 'modules', 'onefchomewidgets', name);

describe('P2-1 todo widget empty + uses viewed date', () => {
  const src = kt('TodoWidgetRenderer.kt');
  it('w_empty_add uses EMPTY slot, w_add uses HEADER slot', () => {
    expect(src).toMatch(/emptyAddIntent = WidgetIntents\.openDay\(context, addDate\(AddSlot\.EMPTY, date, today\)/);
    expect(src).toMatch(/addIntent = WidgetIntents\.openDay\(context, addDate\(AddSlot\.HEADER, date, today\)/);
    expect(src).toMatch(/setOnClickPendingIntent\(R\.id\.w_empty_add, emptyAddIntent\)/);
    expect(src).not.toMatch(/setOnClickPendingIntent\(R\.id\.w_empty_add, addIntent\)/);
  });
});

describe('P2-2 todo send accessibility label', () => {
  it('string + per-mode contentDescription', () => {
    const strings = read('modules', 'onefc-home-widgets', 'android', 'src', 'main', 'res', 'values', 'strings.xml');
    expect(strings).toContain('<string name="onefc_widget_day_send_todo">할 일 저장</string>');
    expect(strings).toContain('<string name="onefc_widget_day_send">일정 저장</string>');
    expect(kt('ScheduleDayActivity.kt')).toMatch(/day_send\)\.contentDescription = getString\(sendDescription\(mode\)\)/);
  });
});

describe('P2-3 todo delete does not flash not-found/retry', () => {
  it('suppresses error while deleting or after delete', () => {
    expect(showTodoLoadError({ isError: false, isSuccess: true, found: false, deleting: true })).toBe(false);
    expect(showTodoLoadError({ isError: true, isSuccess: false, found: false, deleting: true })).toBe(false);
    expect(showTodoLoadError({ isError: false, isSuccess: true, found: false, deleting: false })).toBe(true);
    expect(showTodoLoadError({ isError: true, isSuccess: false, found: false, deleting: false })).toBe(true);
    expect(showTodoLoadError({ isError: false, isSuccess: true, found: true, deleting: false })).toBe(false);
  });
  it('screen passes delete state, no setTimeout', () => {
    const src = read('src', 'features', 'todos', 'TodoFormScreen.tsx');
    expect(src).toMatch(/deleting: deleteMutation\.isPending \|\| deleteMutation\.isSuccess/);
    expect(src).not.toMatch(/setTimeout/);
  });
});

describe('P2-4 schedule row opens event detail', () => {
  const data = { events: [{ id: 'e1' }], tasks: [{ id: 't1' }] };
  it('found → open', () => {
    expect(resolvePendingLinkItem(data, 'e1', { fetching: false, refetched: false })).toEqual({ kind: 'open', item: { id: 'e1' } });
    expect(resolvePendingLinkItem(data, 't1', { fetching: false, refetched: false }).kind).toBe('open');
  });
  it('stale cache miss → refetch once, wait while fetching, then missing', () => {
    expect(resolvePendingLinkItem(data, 'new', { fetching: true, refetched: false })).toEqual({ kind: 'wait' });
    expect(resolvePendingLinkItem(data, 'new', { fetching: false, refetched: false })).toEqual({ kind: 'refetch' });
    expect(resolvePendingLinkItem(data, 'new', { fetching: true, refetched: true })).toEqual({ kind: 'wait' });
    expect(resolvePendingLinkItem(data, 'new', { fetching: false, refetched: true })).toEqual({ kind: 'missing' });
  });
  it('missing ends widget flow instead of returning home', () => {
    const src = read('src', 'features', 'schedule', 'ScheduleScreen.tsx');
    expect(src).toMatch(/else endScheduleWidgetFlow\(\);/);
    expect(src).toMatch(/resolvePendingLinkItem\(data, pendingLinkItem/);
  });
});

describe('P2-5 team post file row sits in KeyboardAwareModal footer', () => {
  const src = read('src', 'features', 'team', 'TeamPostFormModal.tsx');
  it('파일 선택 inside footer, not in ScrollView; no hardcoded padding', () => {
    const footer = src.slice(src.indexOf('footer={('), src.indexOf('<View style={styles.root}>'));
    const body = src.slice(src.indexOf('<ScrollView'));
    expect(footer).toContain('label="파일 선택"');
    expect(body).not.toContain('label="파일 선택"');
    expect(src).not.toMatch(/paddingBottom:\s*\d{2,}/);
  });
});
