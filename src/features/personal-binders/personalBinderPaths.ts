/** PC `personalBinder.api.ts`와 같은 경로. 토큰은 URL에 넣지 않는다. */

function id(value: string): string {
  return encodeURIComponent(value);
}

export const personalBinderPaths = {
  binders: '/api/personal-binders',
  binder: (binderId: string) => `/api/personal-binders/${id(binderId)}`,
  duplicate: (binderId: string) => `/api/personal-binders/${id(binderId)}/duplicate`,
  exportPdf: (binderId: string) => `/api/personal-binders/${id(binderId)}/export`,
  materials: '/api/personal-binders/materials',
  materialDuplicateCheck: '/api/personal-binders/materials/check-duplicate',
  material: (materialId: string) => `/api/personal-binders/materials/${id(materialId)}`,
  sections: (binderId: string) => `/api/personal-binders/${id(binderId)}/sections`,
  section: (sectionId: string) => `/api/personal-binders/sections/${id(sectionId)}`,
  reorderSections: (binderId: string) => `/api/personal-binders/${id(binderId)}/sections/reorder`,
  sectionItems: (sectionId: string) => `/api/personal-binders/sections/${id(sectionId)}/items`,
  reorderItems: (sectionId: string) =>
    `/api/personal-binders/sections/${id(sectionId)}/items/reorder`,
  item: (itemId: string) => `/api/personal-binders/items/${id(itemId)}`,
  binderPages: (binderId: string) => `/api/personal-binders/${id(binderId)}/pages`,
  binderPage: (binderId: string, index: number) => `/api/personal-binders/${id(binderId)}/pages/${index}`,
  /** 공유 바인더 페이지 이미지(읽기 전용, insurance develop #197). 같은 계약, shareId 기준. */
  sharedPages: (shareId: string) => `/api/personal-binders/shared/${id(shareId)}/pages`,
  sharedPage: (shareId: string, index: number) => `/api/personal-binders/shared/${id(shareId)}/pages/${index}`,
  materialPage: (materialId: string, page: number) =>
    `/api/personal-binders/materials/${id(materialId)}/pages/${page}`,
} as const;
