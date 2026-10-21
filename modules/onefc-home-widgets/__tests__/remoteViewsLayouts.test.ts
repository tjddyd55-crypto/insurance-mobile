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
      expect.arrayContaining(['onefc_widget_message.xml', 'onefc_widget_schedule.xml', 'onefc_widget_todo.xml']),
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
});
