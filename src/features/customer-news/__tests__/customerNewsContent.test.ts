import {
  buildCustomerNewsGalleryUrls,
  canPublishCustomerNews,
  draftAttachmentsToPreviewRows,
  hydrateDraftAttachmentsFromItem,
  localAttachmentToDraft,
  previewValidationMessage,
  publishValidationMessage,
} from '../customerNewsContent';
import type { CustomerNewsItem, DraftAttachment } from '../types';

describe('customerNewsContent', () => {
  it('builds gallery urls from hero and attachments without duplicates', () => {
    const urls = buildCustomerNewsGalleryUrls({
      heroImageUrl: 'https://cdn.example/hero.jpg',
      attachments: [
        {
          kind: 'image',
          url: 'https://cdn.example/a.jpg',
          fileName: 'a.jpg',
          sortOrder: 0,
        },
        {
          kind: 'image',
          url: 'https://cdn.example/hero.jpg',
          fileName: 'hero.jpg',
          sortOrder: 1,
        },
      ],
    });
    expect(urls).toEqual(['https://cdn.example/a.jpg', 'https://cdn.example/hero.jpg']);
  });

  it('allows text-only, image-only, and mixed publish states', () => {
    expect(canPublishCustomerNews('hello', [])).toBe(true);
    expect(
      canPublishCustomerNews('', [
        {
          key: 'img-1',
          kind: 'image',
          fileName: 'a.jpg',
          sortOrder: 0,
          url: 'https://cdn.example/a.jpg',
        },
      ]),
    ).toBe(true);
    expect(canPublishCustomerNews('', [])).toBe(false);
    expect(publishValidationMessage('', [])).toContain('내용 또는 첨부파일');
  });

  it('hydrates existing remote images into edit draft attachments', () => {
    const item: CustomerNewsItem = {
      id: '1',
      title: 'legacy',
      content: 'body',
      updatedAt: null,
      isPinned: false,
      heroImageUrl: 'https://cdn.example/hero.jpg',
      attachments: [
        {
          id: 'a',
          kind: 'image',
          url: 'https://cdn.example/a.jpg',
          fileName: 'a.jpg',
          sortOrder: 1,
        },
        {
          id: 'b',
          kind: 'file',
          url: 'https://cdn.example/b.pdf',
          fileName: 'b.pdf',
          sortOrder: 2,
          mimeType: 'application/pdf',
        },
      ],
      scope: 'all',
      targetCustomerId: null,
      targetCustomerName: '',
    };
    const drafts = hydrateDraftAttachmentsFromItem(item);
    expect(drafts.filter((row) => row.kind === 'image').map((row) => row.url)).toEqual([
      'https://cdn.example/hero.jpg',
      'https://cdn.example/a.jpg',
    ]);
    expect(drafts.find((row) => row.kind === 'file')?.fileName).toBe('b.pdf');
  });

  it('merges existing and local attachments for preview rows', () => {
    const drafts: DraftAttachment[] = [
      {
        key: 'remote',
        kind: 'image',
        fileName: 'remote.jpg',
        sortOrder: 0,
        url: 'https://cdn.example/remote.jpg',
      },
      localAttachmentToDraft(
        {
          uri: 'file:///tmp/new.jpg',
          name: 'new.jpg',
          mimeType: 'image/jpeg',
          size: 10,
          kind: 'image',
        },
        1,
      ),
    ];
    const previewRows = draftAttachmentsToPreviewRows(drafts);
    expect(previewRows.map((row) => row.url)).toEqual([
      'https://cdn.example/remote.jpg',
      'file:///tmp/new.jpg',
    ]);
    expect(buildCustomerNewsGalleryUrls({ attachments: previewRows })).toHaveLength(2);
  });

  it('rejects empty preview draft', () => {
    expect(previewValidationMessage('', [])).toContain('미리보기');
  });
});
