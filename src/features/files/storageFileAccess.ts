import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { ApiError } from '../../api/client';
import {
  createStorageFileDownloadUrl,
  createStorageOpenUrl,
} from '../storage/storageApi';
import { shareRemoteFile } from './remoteFileSharing';

export async function previewStorageFileById(
  token: string | null,
  fileId: number,
): Promise<void> {
  const url = await createStorageOpenUrl(token, fileId);
  if (__DEV__) {
    console.info('[previewStorageFileById]', { fileId, url });
  }
  try {
    await WebBrowser.openBrowserAsync(url);
    return;
  } catch (error) {
    if (__DEV__) {
      console.warn('[previewStorageFileById] WebBrowser failed', {
        fileId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new ApiError('파일을 불러오지 못했습니다.', 400);
  }
  await Linking.openURL(url);
}

export async function downloadStorageFileById(
  token: string | null,
  fileId: number,
  fileName: string,
  mimeType: string | null,
): Promise<string> {
  const url = await createStorageFileDownloadUrl(token, fileId);
  if (__DEV__) {
    console.info('[downloadStorageFileById]', { fileId, fileName, url });
  }
  return shareRemoteFile({ url, fileName, mimeType });
}
