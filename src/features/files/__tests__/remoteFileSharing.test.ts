import { buildRemoteCacheFileName } from '../remoteFileSharing';

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
