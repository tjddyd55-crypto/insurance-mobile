import {
  buildCreateCustomerNewsPayload,
  buildCustomerNewsGalleryUrls,
  buildPreviewDraftFromForm,
  buildUpdateCustomerNewsPayload,
  canPublishCustomerNews,
  customerNewsCarouselMode,
  draftAttachmentsToPreviewRows,
  galleryUrlsFromDrafts,
  hydrateDraftAttachmentsFromItem,
  listCardPreviewText,
  localAttachmentToDraft,
  previewValidationMessage,
  publishValidationMessage,
  resolveCustomerNewsBodySegments,
  serializeDraftAttachmentsForSubmit,
} from '../customerNewsContent';
import type { CustomerNewsItem, DraftAttachment } from '../types';

const baseItem: CustomerNewsItem = {
  id: '1',
  title: 'legacy-title',
  content: 'body',
  updatedAt: null,
  isPinned: false,
  heroImageUrl: null,
  attachments: [],
  scope: 'all',
  targetCustomerId: null,
  targetCustomerName: '',
};

function imageDraft(url: string, sortOrder: number, key = url): DraftAttachment {
  return {
    key,
    kind: 'image',
    fileName: `${key}.jpg`,
    sortOrder,
    url,
  };
}

function fileDraft(fileName: string, sortOrder: number): DraftAttachment {
  return {
    key: fileName,
    kind: 'file',
    fileName,
    sortOrder,
    url: `https://cdn.example/${fileName}`,
    mimeType: 'application/pdf',
  };
}

describe('customerNewsContent', () => {
  describe('publish validation', () => {
    it('allows text-only, image-only, file-only, and mixed publish states', () => {
      expect(canPublishCustomerNews('hello', [])).toBe(true);
      expect(canPublishCustomerNews('', [imageDraft('https://cdn.example/a.jpg', 0)])).toBe(true);
      expect(canPublishCustomerNews('', [fileDraft('doc.pdf', 0)])).toBe(true);
      expect(
        canPublishCustomerNews('hello', [imageDraft('https://cdn.example/a.jpg', 0)]),
      ).toBe(true);
    });

    it('rejects empty publish', () => {
      expect(canPublishCustomerNews('', [])).toBe(false);
      expect(publishValidationMessage('', [])).toContain('내용 또는 첨부파일');
      expect(previewValidationMessage('', [])).toContain('미리보기');
    });
  });

  describe('gallery urls', () => {
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

    it('excludes PDF and non-image attachments from carousel dataset', () => {
      const urls = buildCustomerNewsGalleryUrls({
        attachments: [
          {
            kind: 'image',
            url: 'https://cdn.example/a.jpg',
            fileName: 'a.jpg',
            sortOrder: 0,
          },
          {
            kind: 'file',
            url: 'https://cdn.example/doc.pdf',
            fileName: 'doc.pdf',
            sortOrder: 1,
            mimeType: 'application/pdf',
          },
        ],
      });
      expect(urls).toEqual(['https://cdn.example/a.jpg']);
    });

    it('uses mimeType fallback when kind is file but mime is image', () => {
      const urls = buildCustomerNewsGalleryUrls({
        attachments: [
          {
            kind: 'file',
            url: 'https://cdn.example/photo.jpg',
            fileName: 'photo.jpg',
            sortOrder: 0,
            mimeType: 'image/jpeg',
          },
        ],
      });
      expect(urls).toEqual(['https://cdn.example/photo.jpg']);
    });
  });

  describe('carousel mode', () => {
    it('uses single-image mode without indicator metadata', () => {
      expect(customerNewsCarouselMode(0)).toBe('none');
      expect(customerNewsCarouselMode(1)).toBe('single');
    });

    it('uses multi-image carousel mode with indicator metadata', () => {
      expect(customerNewsCarouselMode(2)).toBe('multi');
      expect(customerNewsCarouselMode(5)).toBe('multi');
    });
  });

  describe('body segment order', () => {
    it('renders gallery before content before files', () => {
      expect(
        resolveCustomerNewsBodySegments({
          galleryUrlCount: 2,
          content: 'hello',
          fileCount: 1,
        }),
      ).toEqual(['gallery', 'content', 'files']);
    });

    it('skips empty sections', () => {
      expect(
        resolveCustomerNewsBodySegments({
          galleryUrlCount: 1,
          content: '',
          fileCount: 0,
        }),
      ).toEqual(['gallery']);
      expect(
        resolveCustomerNewsBodySegments({
          galleryUrlCount: 0,
          content: 'only text',
          fileCount: 0,
        }),
      ).toEqual(['content']);
    });
  });

  describe('edit hydrate and merge', () => {
    it('hydrates existing remote images into edit draft attachments', () => {
      const item: CustomerNewsItem = {
        ...baseItem,
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
      };
      const drafts = hydrateDraftAttachmentsFromItem(item);
      expect(drafts.filter((row) => row.kind === 'image').map((row) => row.url)).toEqual([
        'https://cdn.example/hero.jpg',
        'https://cdn.example/a.jpg',
      ]);
      expect(drafts.find((row) => row.kind === 'file')?.fileName).toBe('b.pdf');
    });

    it('hydrates a single existing remote image', () => {
      const drafts = hydrateDraftAttachmentsFromItem({
        ...baseItem,
        attachments: [
          {
            id: 'only',
            kind: 'image',
            url: 'https://cdn.example/only.jpg',
            fileName: 'only.jpg',
            sortOrder: 0,
          },
        ],
      });
      expect(drafts.filter((row) => row.kind === 'image')).toHaveLength(1);
      expect(drafts[0].url).toBe('https://cdn.example/only.jpg');
    });

    it('merges heroImageUrl with attachment images without duplicates', () => {
      const drafts = hydrateDraftAttachmentsFromItem({
        ...baseItem,
        heroImageUrl: 'https://cdn.example/hero.jpg',
        attachments: [
          {
            id: 'hero',
            kind: 'image',
            url: 'https://cdn.example/hero.jpg',
            fileName: 'hero.jpg',
            sortOrder: 0,
          },
          {
            id: 'b',
            kind: 'image',
            url: 'https://cdn.example/b.jpg',
            fileName: 'b.jpg',
            sortOrder: 1,
          },
        ],
      });
      expect(drafts.filter((row) => row.kind === 'image').map((row) => row.url)).toEqual([
        'https://cdn.example/hero.jpg',
        'https://cdn.example/b.jpg',
      ]);
    });

    it('merges existing and local attachments for preview rows', () => {
      const drafts: DraftAttachment[] = [
        imageDraft('https://cdn.example/remote.jpg', 0, 'remote'),
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

    it('appends new local attachments after existing remote images', () => {
      const existing = hydrateDraftAttachmentsFromItem({
        ...baseItem,
        attachments: [
          {
            id: 'a',
            kind: 'image',
            url: 'https://cdn.example/a.jpg',
            fileName: 'a.jpg',
            sortOrder: 0,
          },
          {
            id: 'b',
            kind: 'image',
            url: 'https://cdn.example/b.jpg',
            fileName: 'b.jpg',
            sortOrder: 1,
          },
        ],
      });
      const merged = [
        ...existing.filter((row) => row.kind === 'image'),
        localAttachmentToDraft(
          {
            uri: 'file:///tmp/c.jpg',
            name: 'c.jpg',
            mimeType: 'image/jpeg',
            kind: 'image',
          },
          2,
        ),
      ];
      expect(galleryUrlsFromDrafts(merged)).toEqual([
        'https://cdn.example/a.jpg',
        'https://cdn.example/b.jpg',
        'file:///tmp/c.jpg',
      ]);
    });

    it('excludes deleted remote images from preview draft', () => {
      const hydrated = hydrateDraftAttachmentsFromItem({
        ...baseItem,
        attachments: [
          {
            id: 'a',
            kind: 'image',
            url: 'https://cdn.example/a.jpg',
            fileName: 'a.jpg',
            sortOrder: 0,
          },
          {
            id: 'b',
            kind: 'image',
            url: 'https://cdn.example/b.jpg',
            fileName: 'b.jpg',
            sortOrder: 1,
          },
          {
            id: 'c',
            kind: 'image',
            url: 'https://cdn.example/c.jpg',
            fileName: 'c.jpg',
            sortOrder: 2,
          },
        ],
      });
      const afterDelete = hydrated.filter((row) => row.key !== 'b');
      const preview = buildPreviewDraftFromForm({
        content: 'updated body',
        attachments: afterDelete,
        isPinned: false,
      });
      expect(preview.content).toBe('updated body');
      expect(buildCustomerNewsGalleryUrls({ attachments: preview.attachments })).toEqual([
        'https://cdn.example/a.jpg',
        'https://cdn.example/c.jpg',
      ]);
    });

    it('preserves attachment order in preview and submit serialization', async () => {
      const drafts = [
        imageDraft('https://cdn.example/a.jpg', 0, 'a'),
        imageDraft('https://cdn.example/b.jpg', 1, 'b'),
        fileDraft('doc.pdf', 2),
      ];
      const preview = draftAttachmentsToPreviewRows(drafts);
      expect(preview.map((row) => row.fileName)).toEqual(['a.jpg', 'b.jpg', 'doc.pdf']);

      const uploaded = await serializeDraftAttachmentsForSubmit(drafts, async (asset) => ({
        kind: asset.kind,
        url: asset.uri,
        fileName: asset.name,
        sortOrder: 0,
      }));
      expect(uploaded.map((row) => row.sortOrder)).toEqual([0, 1, 2]);
      expect(uploaded.map((row) => row.fileName)).toEqual(['a.jpg', 'b.jpg', 'doc.pdf']);
    });
  });

  describe('preview draft', () => {
    it('builds preview draft from current form state instead of persisted item', () => {
      const item: CustomerNewsItem = {
        ...baseItem,
        content: 'stored content',
        attachments: [
          {
            id: 'a',
            kind: 'image',
            url: 'https://cdn.example/a.jpg',
            fileName: 'a.jpg',
            sortOrder: 0,
          },
        ],
      };
      const hydrated = hydrateDraftAttachmentsFromItem(item);
      const preview = buildPreviewDraftFromForm({
        content: 'draft content',
        attachments: [
          ...hydrated,
          localAttachmentToDraft(
            {
              uri: 'file:///tmp/local.jpg',
              name: 'local.jpg',
              mimeType: 'image/jpeg',
              kind: 'image',
            },
            1,
          ),
        ],
        isPinned: true,
      });
      expect(preview.content).toBe('draft content');
      expect(buildCustomerNewsGalleryUrls({ attachments: preview.attachments })).toEqual([
        'https://cdn.example/a.jpg',
        'file:///tmp/local.jpg',
      ]);
    });

    it('includes file attachments in preview rows', () => {
      const preview = buildPreviewDraftFromForm({
        content: '',
        attachments: [fileDraft('only.pdf', 0)],
        isPinned: false,
      });
      expect(preview.attachments).toHaveLength(1);
      expect(preview.attachments[0].fileName).toBe('only.pdf');
    });
  });

  describe('submit payloads', () => {
    it('omits title from create payload', () => {
      const payload = buildCreateCustomerNewsPayload({
        content: 'hello',
        scope: 'all',
        targetCustomerId: null,
        sendPush: true,
        isPinned: false,
        attachments: [],
      });
      expect(payload).toEqual({
        content: 'hello',
        scope: 'all',
        targetCustomerId: null,
        sendPush: true,
        isPinned: false,
        attachments: [],
      });
      expect(Object.keys(payload)).not.toContain('title');
    });

    it('omits title from update payload and excludes deleted attachments', async () => {
      const hydrated = hydrateDraftAttachmentsFromItem({
        ...baseItem,
        attachments: [
          {
            id: 'keep',
            kind: 'image',
            url: 'https://cdn.example/keep.jpg',
            fileName: 'keep.jpg',
            sortOrder: 0,
          },
          {
            id: 'drop',
            kind: 'image',
            url: 'https://cdn.example/drop.jpg',
            fileName: 'drop.jpg',
            sortOrder: 1,
          },
        ],
      });
      const remaining = hydrated.filter((row) => row.key !== 'drop');
      const attachments = await serializeDraftAttachmentsForSubmit(remaining, async () => ({
        kind: 'image',
        url: 'https://cdn.example/new.jpg',
        fileName: 'new.jpg',
        sortOrder: 0,
      }));
      const payload = buildUpdateCustomerNewsPayload({
        content: 'updated',
        sendPush: false,
        attachments,
      });
      expect(Object.keys(payload)).not.toContain('title');
      expect(payload.attachments.map((row) => row.fileName)).toEqual(['keep.jpg']);
    });

    it('uploads only local attachments during submit serialization', async () => {
      const upload = jest.fn(async () => ({
        kind: 'image' as const,
        url: 'https://cdn.example/uploaded.jpg',
        fileName: 'uploaded.jpg',
        sortOrder: 0,
      }));
      const result = await serializeDraftAttachmentsForSubmit(
        [
          imageDraft('https://cdn.example/existing.jpg', 0),
          localAttachmentToDraft(
            {
              uri: 'file:///tmp/new.jpg',
              name: 'new.jpg',
              mimeType: 'image/jpeg',
              kind: 'image',
            },
            1,
          ),
        ],
        upload,
      );
      expect(upload).toHaveBeenCalledTimes(1);
      expect(result.map((row) => row.url)).toEqual([
        'https://cdn.example/existing.jpg',
        'https://cdn.example/uploaded.jpg',
      ]);
    });
  });

  describe('list card summary', () => {
    it('uses content excerpt when content exists', () => {
      expect(listCardPreviewText({ ...baseItem, content: '공지 내용입니다' })).toBe('공지 내용입니다');
    });

    it('summarizes image-only posts without a title headline', () => {
      expect(
        listCardPreviewText({
          ...baseItem,
          content: '',
          attachments: [
            {
              kind: 'image',
              url: 'https://cdn.example/a.jpg',
              fileName: 'a.jpg',
              sortOrder: 0,
            },
            {
              kind: 'image',
              url: 'https://cdn.example/b.jpg',
              fileName: 'b.jpg',
              sortOrder: 1,
            },
          ],
        }),
      ).toBe('이미지 2장');
    });

    it('summarizes file-only posts', () => {
      expect(
        listCardPreviewText({
          ...baseItem,
          content: '',
          attachments: [
            {
              kind: 'file',
              url: 'https://cdn.example/a.pdf',
              fileName: 'a.pdf',
              sortOrder: 0,
              mimeType: 'application/pdf',
            },
          ],
        }),
      ).toBe('첨부파일 1개');
    });
  });
});
