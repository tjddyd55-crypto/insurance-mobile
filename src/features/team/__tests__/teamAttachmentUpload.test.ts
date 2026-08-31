import { attachmentContentType, cdnUrlForObjectKey } from '../teamAttachmentUpload';

describe('teamAttachmentUpload', () => {
  test('accepts supported file extensions when mime is absent', () => {
    expect(attachmentContentType({ name: 'claim.PDF', mimeType: undefined })).toBe('application/pdf');
    expect(attachmentContentType({ name: 'photo.jpeg', mimeType: undefined })).toBe('image/jpeg');
  });

  test('rejects unsupported files', () => {
    expect(() => attachmentContentType({ name: 'script.exe', mimeType: undefined })).toThrow('이미지 또는 PDF');
  });

  test('builds public CDN URL without bucket prefix', () => {
    expect(cdnUrlForObjectKey('/platform-assets/team/a.pdf')).toBe('https://cdn.platform-assets.com/team/a.pdf');
  });
});
