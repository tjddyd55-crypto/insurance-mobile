import { widgetQuickEntry, widgetReturnHref } from '../engine/widgetDeepLink';
import { setWidgetNativeForTests } from '../widgetBridge';
import { resumeWidgetQuickEntry } from '../widgetQuickEntryReturn';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

afterEach(() => setWidgetNativeForTests(undefined));

function native(open: boolean | 'missing') {
  const calls: string[] = [];
  setWidgetNativeForTests({
    configure: async () => undefined,
    writeEnvelope: async () => true,
    readEnvelope: async () => null,
    clearAll: async () => undefined,
    installedWidgetTypes: async () => [],
    moveTaskToBack: async () => { calls.push('back'); return true; },
    ...(open === 'missing' ? {} : { openQuickEntry: async (d: string, m: string) => { calls.push(`open:${d}:${m}`); return open; } }),
  });
  return calls;
}

describe('widget quick entry login return', () => {
  it('keeps quick mode through the pending href', () => {
    const href = widgetReturnHref('/schedule', { date: '2026-10-27', quick: 'createEvent', src: 'widget', wt: 'schedule', _w: '1' });
    expect(href).toBe('/schedule?date=2026-10-27&quick=createEvent&src=widget&wt=schedule');
    expect(widgetQuickEntry(href)).toEqual({ date: '2026-10-27', mode: 'createEvent' });
    expect(widgetQuickEntry(widgetReturnHref('/todos', { date: '2026-10-27', quick: 'createTodo', src: 'widget', wt: 'todo' }))).toEqual({ date: '2026-10-27', mode: 'createTodo' });
    expect(widgetQuickEntry('/schedule?date=2026-10-27&quick=day&src=widget')).toEqual({ date: '2026-10-27', mode: 'day' });
  });

  it('ignores non-quick or invalid links', () => {
    expect(widgetQuickEntry('/schedule?date=2026-10-27&src=widget')).toBeNull();
    expect(widgetQuickEntry('/schedule?date=bad&quick=day&src=widget')).toBeNull();
    expect(widgetQuickEntry('/schedule?date=2026-10-27&quick=evil&src=widget')).toBeNull();
    expect(widgetQuickEntry('/customers?date=2026-10-27&quick=day&src=widget')).toBeNull();
    expect(widgetQuickEntry('/schedule?date=2026-10-27&quick=day')).toBeNull();
  });

  it('reopens the native screen then sends the app home', async () => {
    const calls = native(true);
    await expect(resumeWidgetQuickEntry('/todos?date=2026-10-27&quick=createTodo&src=widget&wt=todo')).resolves.toBe(true);
    expect(calls).toEqual(['open:2026-10-27:createTodo', 'back']);
  });

  it('falls back to in-app navigation when native cannot open', async () => {
    expect(await resumeWidgetQuickEntry('/schedule?date=2026-10-27&quick=day&src=widget')).toBe(false);
    native('missing');
    expect(await resumeWidgetQuickEntry('/schedule?date=2026-10-27&quick=day&src=widget')).toBe(false);
    const calls = native(false);
    expect(await resumeWidgetQuickEntry('/schedule?date=2026-10-27&quick=day&src=widget')).toBe(false);
    expect(calls).toEqual(['open:2026-10-27:day']);
    expect(await resumeWidgetQuickEntry('/schedule?date=2026-10-27&src=widget')).toBe(false);
  });
});
