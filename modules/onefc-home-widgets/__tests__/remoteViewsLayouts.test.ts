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
  const remoteLayouts = ['onefc_widget_message.xml', 'onefc_widget_schedule.xml', 'onefc_widget_todo.xml'];

  it('has the expected widget layouts', () => {
    expect(layouts).toEqual(expect.arrayContaining(remoteLayouts));
  });

  it.each(remoteLayouts.map((f: string) => [f]))('%s uses only RemoteViews-allowed classes', (file: string) => {
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
  it('schedule widget is a full month grid without an in-widget list or app title', () => {
    const xml = fs.readFileSync(path.join(LAYOUT_DIR, 'onefc_widget_schedule.xml'), 'utf8');
    expect(xml).not.toContain('w_dot_');
    expect(xml).not.toContain('w_title');
    expect(xml).not.toContain('w_list');
    expect(xml).not.toContain('ONE FC 일정');
    expect(xml).toContain('@+id/w_month"');
    expect(xml).toContain('@+id/w_refresh"');
    expect(xml).toContain('@+id/w_add"');
    for (let r = 0; r < 6; r += 1) for (let c = 0; c < 7; c += 1) {
      for (const id of [`w_cell_${r}_${c}`, `w_day_${r}_${c}`, `w_chip_${r}_${c}_0`, `w_chip_${r}_${c}_1`, `w_cmore_${r}_${c}`, `w_cnt_${r}_${c}`]) expect(xml).toContain(`@+id/${id}"`);
    }
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

  it('manifest keeps two providers, a day dialog, and no list service or extra permission', () => {
    const manifest = fs.readFileSync(path.join(__dirname, '..', 'android', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    expect(manifest).toContain('ScheduleWidgetProvider');
    expect(manifest).toContain('TodoWidgetProvider');
    expect(manifest.match(/android.appwidget.action.APPWIDGET_UPDATE/g)).toHaveLength(2);
    expect(manifest).toContain('ScheduleDayActivity');
    expect(manifest).not.toContain('ScheduleWidgetListService');
    expect(manifest).not.toContain('uses-permission');
    expect(manifest).toContain('android:exported="false"');
  });
});

describe('widget header taps open the app list screens', () => {
  const KT = path.join(__dirname, '..', 'android', 'src', 'main', 'java', 'expo', 'modules', 'onefchomewidgets');
  it('schedule month header opens schedule OPEN deep link (not create)', () => {
    const src = fs.readFileSync(path.join(KT, 'ScheduleWidgetRenderer.kt'), 'utf8');
    expect(src).toMatch(/setOnClickPendingIntent\(R\.id\.w_month, WidgetIntents\.openApp\(context, link\(WidgetDeepLink\.Action\.OPEN/);
    // + 는 앱이 아니라 Native 빠른 입력(createEvent, 오늘 기본). 날짜 칸은 day 모드 그대로.
    expect(src).toContain('setOnClickPendingIntent(R.id.w_add, WidgetIntents.openDay(context, today, ScheduleDayActivity.MODE_CREATE_EVENT))');
    expect(src).toContain('setOnClickPendingIntent(cellId, WidgetIntents.openDay(context, cell.ymd))');
  });
  it('todo title header opens todo list link; + opens native createTodo; date label opens day mode', () => {
    const src = fs.readFileSync(path.join(KT, 'TodoWidgetRenderer.kt'), 'utf8');
    expect(src).toContain('setOnClickPendingIntent(R.id.w_title, WidgetIntents.openApp(context, listLink, nonce))');
    expect(src).toContain('val addIntent = WidgetIntents.openDay(context, today, ScheduleDayActivity.MODE_CREATE_TODO)');
    expect(src).toContain('setOnClickPendingIntent(R.id.w_add, addIntent)');
    expect(src).toContain('setOnClickPendingIntent(R.id.w_day_label, WidgetIntents.openDay(context, date))');
    // 빈 상태(범위 밖 포함) 추가 버튼도 앱으로 가지 않는다.
    expect(src).toContain('views.setOnClickPendingIntent(R.id.w_empty_add, addIntent)');
    expect(src).not.toMatch(/R\.id\.w_empty_add, WidgetIntents\.openApp/);
  });
  it('openDay requestCode reflects mode; day dialog list flexes above input', () => {
    const common = fs.readFileSync(path.join(KT, 'WidgetCommon.kt'), 'utf8');
    expect(common).toContain('ScheduleDayActivity.requestCode(date, mode)');
    const activity = fs.readFileSync(path.join(KT, 'ScheduleDayActivity.kt'), 'utf8');
    expect(activity).not.toContain('capList');
    expect(activity).toContain('setOnApplyWindowInsetsListener');
    expect(activity).toContain('WindowInsets.Type.ime()');
    const xml = fs.readFileSync(path.join(__dirname, '..', 'android', 'src', 'main', 'res', 'layout', 'onefc_day_dialog.xml'), 'utf8');
    expect(xml).toMatch(/android:id="@\+id\/day_scroll" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1"/);
  });
});
