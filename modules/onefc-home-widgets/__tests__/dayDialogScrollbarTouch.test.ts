/** Guard (P1-E, W3): 날짜 모달 스크롤바는 카드 바깥 inset 패딩에, 전송/닫기 터치 영역은 44dp 이상. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

const xml = fs
  .readFileSync(path.join(__dirname, '..', 'android', 'src', 'main', 'res', 'layout', 'onefc_day_dialog.xml'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '');
function tagOf(id: string): string {
  const m = xml.match(new RegExp(`<[A-Za-z]+[^>]*android:id="@\\+id/${id}"[^>]*>`));
  if (!m) throw new Error(`missing ${id}`);
  return m[0];
}
function dp(tag: string, attr: string): number {
  const m = tag.match(new RegExp(`android:${attr}="(\\d+)dp"`));
  return m ? Number(m[1]) : NaN;
}

describe('onefc_day_dialog scrollbar / touch targets', () => {
  // t597u: | 여백 | 카드 | 여백 | 스크롤바 | — 스크롤바는 카드 오른쪽 패딩 안(outsideOverlay)에, 값은 dimens 리소스만.
  it('day_scroll keeps a scrollbar outside the rows with symmetric gutters (dimens only)', () => {
    const scroll = tagOf('day_scroll');
    expect(scroll).toContain('android:scrollbarStyle="outsideOverlay"');
    expect(scroll).toContain('android:paddingEnd="@dimen/onefc_day_scroll_gutter"');
    expect(scroll).toContain('android:layout_marginEnd="@dimen/onefc_day_scroll_gutter_pull"');
    expect(scroll).toContain('android:scrollbarSize="@dimen/onefc_day_scrollbar_size"');
    expect(scroll).not.toMatch(/\d+px"/);
    // 키보드/IME 보정 구조(0dp + weight=1) 유지
    expect(scroll).toContain('android:layout_height="0dp"');
    expect(scroll).toContain('android:layout_weight="1"');
  });

  it.each(['day_send', 'day_close'])('%s touch height >= 44dp', (id) => {
    expect(dp(tagOf(id), 'layout_height')).toBeGreaterThanOrEqual(44);
  });

  it('day_send keeps the widget-only filled green style', () => {
    const send = tagOf('day_send');
    expect(send).toContain('android:background="@drawable/onefc_day_send_bg"');
    expect(send).toContain('android:textColor="@color/onefc_widget_on_brand"');
    expect(dp(send, 'layout_width')).toBeGreaterThanOrEqual(44);
  });
});
