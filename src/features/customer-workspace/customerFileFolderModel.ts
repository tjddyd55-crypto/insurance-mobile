import type { CustomerFile, CustomerFolder } from './types';

export const CUSTOMER_FOLDER_NAME_MAX_LENGTH = 12;

const FOLDER_NAME_REGEX = /^[A-Za-z0-9 \u3131-\u318e\uac00-\ud7a3]+$/;

export type CustomerFolderNavState = {
  folderId: number | null;
};

export function createCustomerFolderNavState(): CustomerFolderNavState {
  return { folderId: null };
}

export function resetCustomerFolderNavState(): CustomerFolderNavState {
  return createCustomerFolderNavState();
}

export function enterCustomerFolder(
  state: CustomerFolderNavState,
  folderId: number,
): CustomerFolderNavState {
  return { folderId };
}

export function leaveCustomerFolder(
  state: CustomerFolderNavState,
  folders: CustomerFolder[],
): CustomerFolderNavState {
  if (state.folderId == null) return state;
  const current = folders.find((folder) => folder.id === state.folderId);
  return { folderId: current?.parentId ?? null };
}

export function listChildFolders(
  folders: CustomerFolder[],
  parentId: number | null,
): CustomerFolder[] {
  return folders
    .filter((folder) => (folder.parentId ?? null) === parentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

export function filterFilesForFolder(
  files: CustomerFile[],
  folderId: number | null,
): CustomerFile[] {
  return files
    .filter((file) => (file.folderId ?? null) === folderId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

export function buildCustomerFolderBreadcrumb(
  folders: CustomerFolder[],
  folderId: number | null,
): CustomerFolder[] {
  if (folderId == null) return [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: CustomerFolder[] = [];
  let current: number | null = folderId;
  while (current != null) {
    const folder = byId.get(current);
    if (!folder) break;
    path.unshift(folder);
    current = folder.parentId;
  }
  return path;
}

export function formatCustomerFolderLocationLabel(
  breadcrumb: CustomerFolder[],
): string {
  if (!breadcrumb.length) return '고객 파일';
  return ['고객 파일', ...breadcrumb.map((folder) => folder.name)].join(' > ');
}

export function validateCustomerFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '폴더 이름을 입력해 주세요.';
  if (trimmed.length > CUSTOMER_FOLDER_NAME_MAX_LENGTH) {
    return '폴더 이름은 12자 이내로 입력해 주세요.';
  }
  if (trimmed === '전체') return '사용할 수 없는 폴더 이름입니다.';
  if (!FOLDER_NAME_REGEX.test(trimmed)) {
    return '폴더 이름에 사용할 수 없는 문자가 포함되어 있습니다.';
  }
  return null;
}

export function customerFileWorkspaceQueryKey(
  customerId: number,
): readonly ['customer-files', number] {
  return ['customer-files', customerId];
}

export function customerFolderWorkspaceQueryKey(
  customerId: number,
): readonly ['customer-folders', number] {
  return ['customer-folders', customerId];
}
