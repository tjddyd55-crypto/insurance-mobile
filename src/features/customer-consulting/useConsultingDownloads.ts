import { useCallback, useRef, useState } from 'react';
import type { WebViewMessageEvent } from 'react-native-webview';

import {
  classifyConsultingRemoteDownload,
  readConsultingRemoteUrl,
  reduceConsultingPdfMessage,
  takeShareTurn,
  type ConsultingRemoteDownload,
  type PdfTransfer,
} from './consultingDownload';
import {
  consultingShareFailureMessage,
  shareConsultingPdfBytes,
  shareConsultingRemoteDownload,
} from './consultingFileShare';
import { evaluateConsultingWebNavigation } from './consultingWebNavigation';
import type { WebCrmSession } from './webCrmSession';

const PDF_SHARE_FAILURE = 'PDF를 공유하지 못했습니다.';

type ShareTurn = { key: string; at: number };

export function useConsultingDownloads(origin: string, session: WebCrmSession) {
  const pdfTransfer = useRef<PdfTransfer | null>(null);
  const shareTurn = useRef<ShareTurn>({ key: '', at: 0 });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const shareRemote = useCallback(async (download: ConsultingRemoteDownload) => {
    if (!takeShareTurn(shareTurn.current, download.url, Date.now())) {
      return;
    }
    try {
      await shareConsultingRemoteDownload(download, session.token);
      setDownloadError(null);
    } catch (error) {
      setDownloadError(consultingShareFailureMessage(error));
    }
  }, [session.token]);

  const shareIfAllowed = useCallback((rawUrl: string) => {
    if (!isAllowedNavigation(rawUrl, origin, session.token)) {
      return;
    }
    const download = classifyConsultingRemoteDownload(rawUrl, origin);
    if (download) {
      void shareRemote(download);
    }
  }, [origin, session.token, shareRemote]);

  const allowRequest = useCallback((url: string) => {
    if (!isAllowedNavigation(url, origin, session.token)) {
      return false;
    }
    const download = classifyConsultingRemoteDownload(url, origin);
    if (!download) {
      return true;
    }
    void shareRemote(download);
    return false;
  }, [origin, session.token, shareRemote]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const raw = event.nativeEvent.data;
    const remoteUrl = readConsultingRemoteUrl(raw);
    if (remoteUrl) {
      shareIfAllowed(remoteUrl);
      return;
    }
    acceptPdfMessage(raw, pdfTransfer, shareTurn, setDownloadError);
  }, [shareIfAllowed]);

  const resetDownloads = useCallback(() => {
    pdfTransfer.current = null;
    setDownloadError(null);
  }, []);

  return { downloadError, allowRequest, onMessage, shareIfAllowed, resetDownloads };
}

function isAllowedNavigation(rawUrl: string, origin: string, secret: string): boolean {
  return evaluateConsultingWebNavigation(rawUrl, origin, secret) === 'allow';
}

function acceptPdfMessage(
  raw: string,
  pdfTransfer: { current: PdfTransfer | null },
  shareTurn: { current: ShareTurn },
  setDownloadError: (message: string | null) => void,
) {
  const next = reduceConsultingPdfMessage(pdfTransfer.current, raw);
  pdfTransfer.current = next.transfer;
  if (next.failed) {
    setDownloadError(PDF_SHARE_FAILURE);
    return;
  }
  if (!next.bytes || !next.fileName) {
    return;
  }
  void sharePdfBytes(next.fileName, next.bytes, shareTurn, setDownloadError);
}

async function sharePdfBytes(
  fileName: string,
  bytes: Uint8Array,
  shareTurn: { current: ShareTurn },
  setDownloadError: (message: string | null) => void,
) {
  const key = `pdf:${fileName}:${bytes.byteLength}`;
  if (!takeShareTurn(shareTurn.current, key, Date.now())) {
    return;
  }
  try {
    await shareConsultingPdfBytes(fileName, bytes);
    setDownloadError(null);
  } catch (error) {
    setDownloadError(consultingShareFailureMessage(error));
  }
}
