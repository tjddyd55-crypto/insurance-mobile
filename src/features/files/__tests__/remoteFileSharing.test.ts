import { Platform } from 'react-native';

import * as Sharing from 'expo-sharing';

import { buildRemoteCacheFileName, downloadRemoteFile, shareRemoteFile } from '../remoteFileSharing';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock('onefc-android-downloads', () => ({
  saveLocalFileToAndroidDownloads: jest.fn().mockResolvedValue('content://media/external/downloads/onefc.pdf'),
}));

jest.mock('expo-file-system', () => {
  const write = jest.fn();
  const create = jest.fn();
  const uri = 'file:///cache/onefc-test.pdf';
  return {
    Paths: { cache: 'cache', document: 'document' },
    File: jest.fn().mockImplementation(() => ({
      create,
      write,
      uri,
    })),
  };
});

describe('buildRemoteCacheFileName', () => {
  it('keeps extension while using an ASCII-safe cache path', () => {
    const name = buildRemoteCacheFileName('보험금청구서,진단서.pdf');
    expect(name).toMatch(/^onefc-\d+\.pdf$/);
    expect(name).not.toContain(',');
    expect(name).not.toContain('보험');
  });

  it('preserves image extensions', () => {
    expect(buildRemoteCacheFileName('신분증.jpg')).toMatch(/\.jpg$/);
    expect(buildRemoteCacheFileName('scan.PNG')).toMatch(/\.PNG$/);
  });
});

describe('downloadRemoteFile on native', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('saves to cache without opening the share sheet', async () => {
    Platform.OS = 'android';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }),
    );

    const saved = await downloadRemoteFile(
      {
        url: 'https://insurance-dev.example/api/agent/customer-claim-requests/1/files.pdf?customerId=9',
        fileName: '고객-보험청구-1.pdf',
        mimeType: 'application/pdf',
        headers: { Authorization: 'Bearer token' },
      },
      { saveToUserAccessibleLocation: true },
    );

    expect(saved.uri).toBe('content://media/external/downloads/onefc.pdf');
    expect(saved.savedToUserAccessibleLocation).toBe(true);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('shareRemoteFile on web', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.restoreAllMocks();
  });

  it('saves the downloaded PDF through the browser instead of the native share sheet', async () => {
    Platform.OS = 'web';
    const click = jest.fn();
    const anchor = { href: '', download: '', click, remove: jest.fn() };
    const appendChild = jest.fn();
    Object.assign(globalThis, {
      document: {
        createElement: () => anchor,
        body: { appendChild },
      },
    });
    const createObjectURL = jest.fn(() => 'blob:qa-binder');
    Object.assign(URL, { createObjectURL });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));

    const saved = await shareRemoteFile({
      url: 'https://insurance-dev.example/api/personal-binders/22/export',
      fileName: 'QA 네이티브 바인더.pdf',
      mimeType: 'application/pdf',
      headers: { Authorization: 'Bearer token' },
    });

    expect(saved).toBe('blob:qa-binder');
    expect(anchor.download).toBe('QA 네이티브 바인더.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(anchor);
  });
});
