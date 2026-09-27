import { useCallback, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import {
  createCoverageSimulationShare,
  listCoverageSimulationShares,
  revokeCoverageSimulationShare,
  type CoverageShareListItem,
} from './coverageShareApi';
import {
  COVERAGE_SHARE_COPY,
  buildCoverageShareWebSharePayload,
  buildReactNativeShareContent,
  coverageScenarioCanBeShared,
  coverageShareButtonLabel,
  mapCoverageShareCreateError,
  mapCoverageShareHistoryError,
  prepareScenarioSnapshotForShare,
} from './coverageShareModel';
import type { CoverageScenario } from './types';

type Params = {
  token: string | null;
  scenario: CoverageScenario | null;
  /** 네이티브 편집은 변경 즉시 로컬 저장이라 기본은 false. PC 와 같이 true 면 저장 확인 후 공유한다. */
  dirty?: boolean;
  persisted?: boolean;
  showToast: (message: string) => void;
  confirmSave?: () => Promise<boolean>;
  saveScenario?: (scenario: CoverageScenario) => Promise<CoverageScenario>;
};

function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useCoverageShareSession({
  token,
  scenario,
  dirty = false,
  persisted = true,
  showToast,
  confirmSave,
  saveScenario,
}: Params) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [historyShares, setHistoryShares] = useState<CoverageShareListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const shareUrlRef = useRef<string | null>(null);
  const snapshotRef = useRef<CoverageScenario | null>(null);

  const canShare = scenario != null && coverageScenarioCanBeShared(scenario);

  const loadHistory = useCallback(async () => {
    if (!token?.trim() || !scenario) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await listCoverageSimulationShares(token, scenario.id);
      setHistoryShares(result.shares);
    } catch (error) {
      setHistoryError(mapCoverageShareHistoryError(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [scenario, token]);

  const snapshotForShare = useCallback(async () => {
    if (!scenario) return null;
    const prepared = await prepareScenarioSnapshotForShare({
      scenario,
      dirty,
      persisted,
      confirmSave: confirmSave ?? (async () => false),
      save: saveScenario ?? (async (current) => current),
    });
    if (!prepared.ok) {
      if (prepared.reason === 'save-failed') showToast(COVERAGE_SHARE_COPY.saveFailed);
      return null;
    }
    return prepared.scenario;
  }, [confirmSave, dirty, persisted, saveScenario, scenario, showToast]);

  const openShare = useCallback(async () => {
    if (!scenario || !coverageScenarioCanBeShared(scenario)) return;
    if (!token?.trim()) {
      showToast(COVERAGE_SHARE_COPY.loginRequired);
      return;
    }
    const snapshot = await snapshotForShare();
    if (!snapshot) return;
    snapshotRef.current = snapshot;
    setShareUrl(null);
    shareUrlRef.current = null;
    setCreateError(null);
    setDialogOpen(true);
    void loadHistory();
  }, [loadHistory, scenario, showToast, snapshotForShare, token]);

  const ensureShareUrl = useCallback(async () => {
    if (shareUrlRef.current) return shareUrlRef.current;
    if (!token?.trim() || busyRef.current) return null;
    const snapshot = snapshotRef.current ?? await snapshotForShare();
    if (!snapshot) return null;
    busyRef.current = true;
    setSharing(true);
    setCreateError(null);
    try {
      const created = await createCoverageSimulationShare(token, snapshot);
      shareUrlRef.current = created.shareUrl;
      setShareUrl(created.shareUrl);
      void loadHistory();
      return created.shareUrl;
    } catch (error) {
      setCreateError(mapCoverageShareCreateError(error));
      return null;
    } finally {
      busyRef.current = false;
      setSharing(false);
    }
  }, [loadHistory, snapshotForShare, token]);

  const copyText = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      const copied = await Clipboard.setStringAsync(url);
      showToast(copied ? COVERAGE_SHARE_COPY.copied : COVERAGE_SHARE_COPY.copyFailed);
    } catch {
      showToast(COVERAGE_SHARE_COPY.copyFailed);
    }
  }, [showToast]);

  const copyShareLink = useCallback(async () => {
    const url = await ensureShareUrl();
    await copyText(url);
  }, [copyText, ensureShareUrl]);

  const nativeShare = useCallback(async () => {
    const url = await ensureShareUrl();
    if (!url || !scenario) return;
    const payload = buildCoverageShareWebSharePayload({
      shareUrl: url,
      customerName: scenario.customerNameSnapshot ?? scenario.customerName,
      title: scenario.title,
    });
    const content = buildReactNativeShareContent(payload, Platform.OS);
    try {
      const result = await Share.share(content);
      if (result.action === Share.dismissedAction) return;
    } catch (error) {
      if (isShareCancelled(error)) return;
      showToast(COVERAGE_SHARE_COPY.nativeShareFailed);
    }
  }, [ensureShareUrl, scenario, showToast]);

  const revokeShare = useCallback(async (shareId: string) => {
    if (!token?.trim()) return;
    try {
      await revokeCoverageSimulationShare(token, shareId);
      await loadHistory();
    } catch {
      setCreateError(COVERAGE_SHARE_COPY.revokeFailed);
    }
  }, [loadHistory, token]);

  const closeDialog = useCallback(() => {
    if (busyRef.current) return;
    setDialogOpen(false);
    setCreateError(null);
  }, []);

  return {
    canShare,
    sharing,
    buttonLabel: coverageShareButtonLabel(sharing),
    dialogOpen,
    openShare,
    dialog: {
      loading: sharing,
      createError,
      shareUrl,
      historyShares,
      historyLoading,
      historyError,
      onClose: closeDialog,
      onCopyLink: () => void copyShareLink(),
      onNativeShare: () => void nativeShare(),
      onRetryHistory: () => void loadHistory(),
      onCopyHistoryLink: (url: string | null) => void copyText(url),
      onRevokeShare: (shareId: string) => void revokeShare(shareId),
    },
  };
}
