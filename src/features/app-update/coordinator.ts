import {
  OTA_APPLY_ACTION,
  OTA_APPLY_MESSAGE,
  PLAY_AVAILABLE_MESSAGE,
  PLAY_DOWNLOADED_MESSAGE,
  PLAY_INSTALL_ACTION,
  PLAY_LATER_ACTION,
  PLAY_UPDATE_ACTION,
  type PlayCheckStatus,
  type PlayUpdateFlow,
} from './policy';
import { withTimeout } from './timeout';

/**
 * 실행 순서: OTA 확인·받기 → (준비되면) 적용 확인 → 그 다음에 Play 인앱 업데이트.
 * OTA reload는 JS를 다시 띄우므로, Play 다운로드를 먼저 시작하면 재시작에 진행 상태가 끊긴다.
 * 프롬프트는 한 칸만 있다. OTA 확인이 사용자 응답을 기다리는 동안 Play 검사는 시작하지 않는다.
 */

export type UpdateTrigger = 'launch' | 'foreground';

export type OtaPrepareResult = {
  status: 'skipped' | 'none' | 'ready' | 'failed';
  updateId?: string | null;
};

export type PlayFlowResult = 'accepted' | 'canceled' | 'failed' | 'unavailable';

export type UpdatePrompt = {
  id: 'ota' | 'play_available' | 'play_install';
  message: string;
  confirmLabel: string;
  dismissLabel?: string;
};

export type CoordinatorPhase =
  | 'idle'
  | 'checking_ota'
  | 'prompt_ota'
  | 'reloading'
  | 'checking_play'
  | 'prompt_play'
  | 'play_starting'
  | 'play_downloading'
  | 'prompt_install'
  | 'settled';

export type CoordinatorSnapshot = {
  phase: CoordinatorPhase;
  prompt: UpdatePrompt | null;
};

export type AppUpdatePorts = {
  now: () => number;
  timeoutMs: number;
  foregroundThrottleMs: number;
  otaEnabled: () => boolean;
  prepareOta: () => Promise<OtaPrepareResult>;
  reloadOta: () => Promise<void>;
  playEnabled: () => boolean;
  playFlow: PlayUpdateFlow;
  checkPlay: () => Promise<PlayCheckStatus>;
  startPlay: (flow: PlayUpdateFlow) => Promise<PlayFlowResult>;
  completePlay: () => Promise<void>;
};

const OTA_FAILED: OtaPrepareResult = { status: 'failed' };
const PLAY_FAILED: PlayCheckStatus = 'failed';

type Listener = (snapshot: CoordinatorSnapshot) => void;

export function createAppUpdateCoordinator(ports: AppUpdatePorts) {
  let phase: CoordinatorPhase = 'idle';
  let prompt: UpdatePrompt | null = null;
  let token = 0;
  let pending: Promise<void> | null = null;
  let launchStarted = false;
  let lastCheckAt: number | null = null;
  let dismissedOtaId: string | null = null;
  let readyOtaId: string | null = null;
  let playSoftDismissed = false;
  let installDismissed = false;
  let playDownloadActive = false;
  let pendingInstall = false;
  const listeners = new Set<Listener>();

  function snapshot(): CoordinatorSnapshot {
    return { phase, prompt };
  }

  function emit(): void {
    const next = snapshot();
    for (const listener of listeners) {
      listener(next);
    }
  }

  function setPhase(next: CoordinatorPhase): void {
    phase = next;
    emit();
  }

  function settle(): void {
    phase = 'settled';
    prompt = null;
    emit();
  }

  function isCurrent(current: number): boolean {
    return current === token;
  }

  function nextToken(): number {
    token += 1;
    return token;
  }

  function showPrompt(next: UpdatePrompt): void {
    if (prompt) {
      if (next.id === 'play_install') {
        pendingInstall = true;
      }
      return;
    }
    prompt = next;
    phase = phaseForPrompt(next);
    emit();
  }

  function blocksNewCheck(): boolean {
    if (prompt) {
      return true;
    }
    return phase === 'checking_ota'
      || phase === 'checking_play'
      || phase === 'reloading'
      || phase === 'play_starting';
  }

  function withinThrottle(): boolean {
    if (lastCheckAt === null) {
      return false;
    }
    return ports.now() - lastCheckAt < ports.foregroundThrottleMs;
  }

  async function checkOta(current: number): Promise<boolean> {
    if (!ports.otaEnabled()) {
      return false;
    }
    setPhase('checking_ota');
    const result = await withTimeout(() => ports.prepareOta(), ports.timeoutMs, OTA_FAILED);
    if (!isCurrent(current)) {
      return true;
    }
    if (result.status !== 'ready' || !result.updateId || result.updateId === dismissedOtaId) {
      return false;
    }
    readyOtaId = result.updateId;
    showPrompt({
      id: 'ota',
      message: OTA_APPLY_MESSAGE,
      confirmLabel: OTA_APPLY_ACTION,
    });
    return true;
  }

  async function checkPlay(current: number): Promise<void> {
    if (!isCurrent(current)) {
      return;
    }
    if (pendingInstall && !installDismissed) {
      pendingInstall = false;
      showInstallPrompt();
      return;
    }
    pendingInstall = false;
    if (!ports.playEnabled()) {
      return;
    }
    setPhase('checking_play');
    const status = await withTimeout(() => ports.checkPlay(), ports.timeoutMs, PLAY_FAILED);
    if (!isCurrent(current)) {
      return;
    }
    await applyPlayStatus(status);
  }

  async function applyPlayStatus(status: PlayCheckStatus): Promise<void> {
    if (status === 'downloaded') {
      playDownloadActive = true;
      if (!installDismissed) {
        showInstallPrompt();
        return;
      }
      settle();
      return;
    }
    if (status === 'in_progress') {
      playDownloadActive = true;
      setPhase('play_downloading');
      return;
    }
    if (status === 'available' && !playSoftDismissed) {
      await offerAvailableUpdate();
      return;
    }
    playDownloadActive = false;
    settle();
  }

  async function offerAvailableUpdate(): Promise<void> {
    if (ports.playFlow === 'immediate') {
      await handOffImmediate();
      return;
    }
    showPrompt({
      id: 'play_available',
      message: PLAY_AVAILABLE_MESSAGE,
      confirmLabel: PLAY_UPDATE_ACTION,
      dismissLabel: PLAY_LATER_ACTION,
    });
  }

  async function handOffImmediate(): Promise<void> {
    setPhase('play_starting');
    const result = await withTimeout(() => ports.startPlay('immediate'), ports.timeoutMs, 'failed');
    if (result === 'canceled') {
      playSoftDismissed = true;
    }
    settle();
  }

  function showInstallPrompt(): void {
    showPrompt({
      id: 'play_install',
      message: PLAY_DOWNLOADED_MESSAGE,
      confirmLabel: PLAY_INSTALL_ACTION,
    });
  }

  function finishIfIdle(current: number): void {
    if (!isCurrent(current) || prompt) {
      return;
    }
    if (phase === 'play_downloading' || phase === 'reloading' || phase === 'play_starting') {
      return;
    }
    settle();
  }

  async function continueToPlay(): Promise<void> {
    const current = nextToken();
    try {
      await checkPlay(current);
      finishIfIdle(current);
    } catch {
      if (isCurrent(current)) {
        settle();
      }
    }
  }

  async function execute(resumeDownload: boolean): Promise<void> {
    const current = nextToken();
    try {
      if (!resumeDownload) {
        lastCheckAt = ports.now();
        const waitingForOta = await checkOta(current);
        if (waitingForOta || !isCurrent(current)) {
          return;
        }
      }
      await checkPlay(current);
      finishIfIdle(current);
    } catch {
      if (isCurrent(current)) {
        settle();
      }
    }
  }

  async function applyOta(): Promise<void> {
    prompt = null;
    setPhase('reloading');
    try {
      await ports.reloadOta();
    } catch {
      await continueToPlay();
      return;
    }
    // reload가 프로세스를 바꾸기 전에 Play 프롬프트를 띄우지 않는다.
    settle();
  }

  async function beginFlexibleDownload(): Promise<void> {
    prompt = null;
    setPhase('play_starting');
    const result = await withTimeout(() => ports.startPlay('flexible'), ports.timeoutMs, 'failed');
    if (result !== 'accepted') {
      playDownloadActive = false;
      if (result === 'canceled') {
        playSoftDismissed = true;
      }
      settle();
      return;
    }
    playDownloadActive = true;
    if (pendingInstall && !installDismissed) {
      pendingInstall = false;
      showInstallPrompt();
      return;
    }
    setPhase('play_downloading');
  }

  async function installDownloaded(): Promise<void> {
    prompt = null;
    emit();
    try {
      await ports.completePlay();
    } catch {
      // 설치 호출 실패는 앱 사용을 막지 않는다.
    }
    playDownloadActive = false;
    settle();
  }

  return {
    getSnapshot: snapshot,
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start(reason: UpdateTrigger): Promise<void> {
      if (reason === 'foreground' && !launchStarted) {
        return;
      }
      if (reason === 'launch') {
        launchStarted = true;
      }
      if (blocksNewCheck()) {
        return pending ?? Promise.resolve();
      }
      const resumeDownload = reason === 'foreground' && playDownloadActive;
      if (reason === 'foreground' && !resumeDownload && withinThrottle()) {
        return;
      }
      if (reason === 'foreground') {
        installDismissed = false;
      }
      const run = execute(resumeDownload);
      pending = run;
      try {
        await run;
      } finally {
        if (pending === run) {
          pending = null;
        }
      }
    },
    async accept(): Promise<void> {
      if (prompt?.id === 'ota') {
        await applyOta();
        return;
      }
      if (prompt?.id === 'play_available') {
        await beginFlexibleDownload();
        return;
      }
      if (prompt?.id === 'play_install') {
        await installDownloaded();
      }
    },
    async dismiss(): Promise<void> {
      if (prompt?.id === 'ota') {
        dismissedOtaId = readyOtaId;
        prompt = null;
        emit();
        await continueToPlay();
        return;
      }
      if (prompt?.id === 'play_available') {
        playSoftDismissed = true;
        settle();
        return;
      }
      if (prompt?.id === 'play_install') {
        installDismissed = true;
        settle();
      }
    },
    notifyPlayDownloaded(): void {
      playDownloadActive = true;
      if (blocksNewCheck()) {
        pendingInstall = true;
        return;
      }
      if (installDismissed) {
        return;
      }
      showInstallPrompt();
    },
  };
}

function phaseForPrompt(prompt: UpdatePrompt): CoordinatorPhase {
  if (prompt.id === 'ota') {
    return 'prompt_ota';
  }
  if (prompt.id === 'play_available') {
    return 'prompt_play';
  }
  return 'prompt_install';
}

export type AppUpdateCoordinator = ReturnType<typeof createAppUpdateCoordinator>;
