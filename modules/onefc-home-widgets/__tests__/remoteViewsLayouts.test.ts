/**
 * Guard: every widget layout inflated through RemoteViews may only use classes
 * on the RemoteViews allowlist. A plain <View> (or <Space>, custom views, etc.)
 * makes the launcher fail with "Class not allowed to be inflated" and shows
 * "위젯을 추가할 수 없습니다" on device.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readdirSync(p: string): string[]; readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

const RES_DIR = path.join(__dirname, '..', 'android', 'src', 'main', 'res');
const LAYOUT_DIR = path.join(RES_DIR, 'layout');

// https://developer.android.com/develop/ui/views/appwidgets/overview#types (RemoteViews @RemoteView classes)
const ALLOWED = new Set([
  'FrameLayout', 'LinearLayout', 'RelativeLayout', 'GridLayout',
  'AnalogClock', 'Button', 'Chronometer', 'ImageButton', 'ImageView',
  'ProgressBar', 'TextView', 'ViewFlipper', 'ListView', 'GridView',
  'StackView', 'AdapterViewFlipper', 'TextClock',
  'CheckBox', 'Switch', 'RadioButton', 'RadioGroup',
  // non-view structural tags
  'merge', 'include', 'requestFocus',
]);

const layouts = fs.readdirSync(LAYOUT_DIR).filter((f: string) => f.endsWith('.xml'));

describe('home widget RemoteViews layouts', () => {
  it('has the expected widget layouts', () => {
    expect(layouts).toEqual(
      expect.arrayContaining(['onefc_widget_message.xml', 'onefc_widget_schedule.xml', 'onefc_widget_schedule_item.xml', 'onefc_widget_todo.xml']),
    );
  });

  it.each(layouts.map((f: string) => [f]))('%s uses only RemoteViews-allowed classes', (file: string) => {
    const xml = fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const tags = Array.from(xml.matchAll(/<([A-Za-z][\w.]*)[\s/>]/g)).map((m: RegExpMatchArray) => m[1]);
    const bad = tags.filter((t: string) => !ALLOWED.has(t));
    expect(bad).toEqual([]);
  });

  it('every layout referenced by appwidget-provider xml exists and is guarded', () => {
    const xmlDir = path.join(RES_DIR, 'xml');
    for (const f of fs.readdirSync(xmlDir)) {
      const src = fs.readFileSync(path.join(xmlDir, f), 'utf8');
      for (const m of src.matchAll(/(?:initialLayout|previewLayout)="@layout\/(\w+)"/g)) {
        expect(layouts).toContain(`${m[1]}.xml`);
      }
    }
  });
  it('schedule widget: no legacy dots, every cell has day/chips/+N/count ids, list is a ListView collection', () => {
    const xml = fs.readFileSync(path.join(LAYOUT_DIR, 'onefc_widget_schedule.xml'), 'utf8');
    expect(xml).not.toContain('w_dot_');
    for (let r = 0; r < 6; r += 1) for (let c = 0; c < 7; c += 1) {
      for (const id of [`w_cell_${r}_${c}`, `w_day_${r}_${c}`, `w_chip_${r}_${c}_0`, `w_chip_${r}_${c}_1`, `w_cmore_${r}_${c}`, `w_cnt_${r}_${c}`]) expect(xml).toContain(`@+id/${id}"`);
    }
    expect(xml).toMatch(/<ListView android:id="@\+id\/w_list"/);
    // 글자 크기는 dimens(sp) 로만
    expect(xml).not.toMatch(/textSize="(\d+)sp"/);
  });

  it('todo and login message use the shared text dimens', () => {
    for (const file of ['onefc_widget_todo.xml', 'onefc_widget_message.xml']) {
      const xml = fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8');
      expect(xml).not.toMatch(/textSize="(\d+)sp"/);
      expect(xml).toContain('@dimen/onefc_widget_title_text');
      expect(xml).toContain('@dimen/onefc_widget_item_text');
    }
    const todo = fs.readFileSync(path.join(LAYOUT_DIR, 'onefc_widget_todo.xml'), 'utf8');
    expect(todo).toContain('@dimen/onefc_widget_month_text');
    expect(todo).toContain('@dimen/onefc_widget_nav_text');
    expect(todo).toContain('@dimen/onefc_widget_status_text');
    expect(todo).toContain('ellipsize="end"');
  });

  it('collection service is declared with BIND_REMOTEVIEWS', () => {
    const manifest = fs.readFileSync(path.join(__dirname, '..', 'android', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    expect(manifest).toMatch(/ScheduleWidgetListService"[\s\S]*?android:permission="android.permission.BIND_REMOTEVIEWS"/);
  });
});
