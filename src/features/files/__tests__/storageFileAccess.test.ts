import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import {
  createStorageFileDownloadUrl,
  createStorageOpenUrl,
} from '../../storage/storageApi';
import {
  downloadStorageFileById,
  previewStorageFileById,
} from '../storageFileAccess';
import { shareRemoteFile } from '../remoteFileSharing';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('../../storage/storageApi', () => ({
  createStorageOpenUrl: jest.fn(),
  createStorageFileDownloadUrl: jest.fn(),
}));

jest.mock('../remoteFileSharing', () => ({
  shareRemoteFile: jest.fn(),
}));

describe('storageFileAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests inline open-token for preview and opens in browser', async () => {
    jest.mocked(createStorageOpenUrl).mockResolvedValue('https://api.example/open/inline.pdf');
    jest.mocked(WebBrowser.openBrowserAsync).mockResolvedValue({
      type: 'opened',
    } as Awaited<ReturnType<typeof WebBrowser.openBrowserAsync>>);

    await previewStorageFileById('token', 42);

    expect(createStorageOpenUrl).toHaveBeenCalledWith('token', 42);
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://api.example/open/inline.pdf');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('falls back to Linking when browser preview fails', async () => {
    jest.mocked(createStorageOpenUrl).mockResolvedValue('https://api.example/open/inline.pdf');
    jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValue(new Error('browser failed'));
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await previewStorageFileById('token', 7);

    expect(Linking.openURL).toHaveBeenCalledWith('https://api.example/open/inline.pdf');
  });

  it('requests attachment open-token for download and preserves filename', async () => {
    jest.mocked(createStorageFileDownloadUrl).mockResolvedValue('https://api.example/open/attach.pdf');
    jest.mocked(shareRemoteFile).mockResolvedValue('file:///cache/onefc-1.pdf');

    await downloadStorageFileById('token', 11, '보험금청구서,진단서.pdf', 'application/pdf');

    expect(createStorageFileDownloadUrl).toHaveBeenCalledWith('token', 11);
    expect(shareRemoteFile).toHaveBeenCalledWith({
      url: 'https://api.example/open/attach.pdf',
      fileName: '보험금청구서,진단서.pdf',
      mimeType: 'application/pdf',
    });
  });
});
