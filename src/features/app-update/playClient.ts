import {
  beginPlayUpdate,
  finishPlayUpdate,
  readPlayUpdate,
  subscribePlayInstallStatus,
} from 'onefc-play-app-update';

import {
  normalizePlayFlowResult,
  normalizePlayStatus,
  type PlayCheckStatus,
  type PlayUpdateFlow,
} from './policy';
import type { PlayFlowResult } from './coordinator';

export async function checkPlayAppUpdate(flow: PlayUpdateFlow): Promise<PlayCheckStatus> {
  try {
    const result = await readPlayUpdate(flow);
    return normalizePlayStatus(result.status);
  } catch {
    return 'failed';
  }
}

export async function startPlayAppUpdate(flow: PlayUpdateFlow): Promise<PlayFlowResult> {
  try {
    return normalizePlayFlowResult(await beginPlayUpdate(flow));
  } catch {
    return 'failed';
  }
}

export async function completePlayAppUpdate(): Promise<void> {
  const installed = await finishPlayUpdate();
  if (!installed) {
    throw new Error('play_complete_failed');
  }
}

export function listenForPlayDownload(onDownloaded: () => void): () => void {
  return subscribePlayInstallStatus((status) => {
    if (status === 'downloaded') {
      onDownloaded();
    }
  });
}
