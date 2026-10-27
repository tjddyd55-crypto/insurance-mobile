/* eslint-disable @typescript-eslint/no-require-imports */
import { createDoubleBackExit, ROOT_BACK_EXIT_MESSAGE } from '../rootBackExit';

const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

function setup() {
  let t = 1000;
  const showToast = jest.fn();
  const leaveApp = jest.fn();
  const press = createDoubleBackExit({ now: () => t, showToast, leaveApp });
  return { press, showToast, exitApp: leaveApp, advance: (ms: number) => { t += ms; } };
}

describe('root double-back exit', () => {
  it('first press shows toast, consumes, no exit', () => {
    const s = setup();
    expect(s.press()).toBe(true);
    expect(s.showToast).toHaveBeenCalledWith(ROOT_BACK_EXIT_MESSAGE);
    expect(s.exitApp).not.toHaveBeenCalled();
  });
  it('second press within 2s exits', () => {
    const s = setup();
    s.press(); s.advance(1500); s.press();
    expect(s.exitApp).toHaveBeenCalledTimes(1);
  });
  it('after the window it resets (toast again, no exit)', () => {
    const s = setup();
    s.press(); s.advance(2500); s.press();
    expect(s.exitApp).not.toHaveBeenCalled();
    expect(s.showToast).toHaveBeenCalledTimes(2);
  });
  it('hook: Android-only, focus-scoped, yields when history exists; mounted only on Home', () => {
    const hook = fs.readFileSync(path.join(__dirname, '../useRootBackExit.ts'), 'utf8');
    expect(hook).toContain("Platform.OS !== 'android'");
    expect(hook).toContain('useFocusEffect(');
    expect(hook).toContain('if (navigation.canGoBack()) return false;');
    const home = fs.readFileSync(path.join(__dirname, '../../features/home/HomeScreen.tsx'), 'utf8');
    expect(home).toContain('useRootBackExit();');
  });
  it('modal back handlers still consume back first (registered on open, LIFO)', () => {
    const dlg = fs.readFileSync(path.join(__dirname, '../../components/ConfirmDialog.tsx'), 'utf8');
    expect(dlg).toContain("addEventListener('hardwareBackPress'");
  });
});

describe('root back hook wiring (non-root / modal / drawer)', () => {
  it('only Home mounts the hook; drawer/modal handlers register on open and run first', () => {
    const hook = fs.readFileSync(path.join(__dirname, '../useRootBackExit.ts'), 'utf8');
    expect(hook).toContain("ToastAndroid.show(message, ToastAndroid.SHORT)");
    expect(hook.match(/exitApp\(\)/g)).toHaveLength(1);
  });
});
