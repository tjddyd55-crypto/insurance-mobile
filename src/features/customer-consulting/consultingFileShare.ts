import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ApiError } from '../../api/client';
import { buildRemoteCacheFileName, shareRemoteFile } from '../files/remoteFileSharing';
import { consultingDownloadHeaders, type ConsultingRemoteDownload } from './consultingDownload';

const PDF_MIME = 'application/pdf';
const SHARE_FAILURE = 'PDF를 공유하지 못했습니다.';

export async function shareConsultingRemoteDownload(
  download: ConsultingRemoteDownload,
  accessToken: string,
): Promise<void> {
  await shareRemoteFile({
    url: download.url,
    fileName: download.fileName,
    mimeType: PDF_MIME,
    headers: consultingDownloadHeaders(download.kind, accessToken),
  });
}

export async function shareConsultingPdfBytes(fileName: string, bytes: Uint8Array): Promise<void> {
  if (bytes.byteLength === 0) {
    throw new ApiError('PDF 내용이 비어 있습니다.', 400);
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('이 기기에서는 파일 공유를 사용할 수 없습니다.', 400);
  }
  const file = new File(Paths.cache, buildRemoteCacheFileName(fileName));
  file.create({ overwrite: true });
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: PDF_MIME, dialogTitle: fileName });
}

export function consultingShareFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }
  return SHARE_FAILURE;
}
