/** 루트(홈) Android 뒤로가기 2회 종료 정책 — 순수 로직(테스트 가능). */
export const ROOT_BACK_EXIT_WINDOW_MS = 2000;
export const ROOT_BACK_EXIT_MESSAGE = '한 번 더 누르면 종료됩니다';

export function createDoubleBackExit(deps: {
  now: () => number;
  showToast: (message: string) => void;
  leaveApp: () => void;
  windowMs?: number;
}) {
  const windowMs = deps.windowMs ?? ROOT_BACK_EXIT_WINDOW_MS;
  let armedAt: number | null = null;
  return function onRootBack(): boolean {
    const t = deps.now();
    if (armedAt != null && t - armedAt <= windowMs) {
      armedAt = null;
      deps.leaveApp();
      return true;
    }
    armedAt = t;
    deps.showToast(ROOT_BACK_EXIT_MESSAGE);
    return true;
  };
}
