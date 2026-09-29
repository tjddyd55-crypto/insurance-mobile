import {
  buildCustomerFolderBreadcrumb,
  createCustomerFolderNavState,
  enterCustomerFolder,
  filterFilesForFolder,
  leaveCustomerFolder,
  listChildFolders,
  resetCustomerFolderNavState,
  validateCustomerFolderName,
} from '../customerFileFolderModel';
import type { CustomerFile, CustomerFolder } from '../types';

const folders: CustomerFolder[] = [
  { id: 1, name: '보험청구', parentId: null, customerId: 711, createdAt: '2026-09-16T10:00:00.000Z' },
  { id: 2, name: '2026년', parentId: 1, customerId: 711, createdAt: '2026-09-16T11:00:00.000Z' },
  { id: 3, name: '계약서', parentId: null, customerId: 711, createdAt: '2026-09-15T10:00:00.000Z' },
];

const files: CustomerFile[] = [
  {
    id: 10,
    displayName: 'root.pdf',
    fileName: 'root.pdf',
    fileUrl: 'https://example.com/root.pdf',
    fileSize: 10,
    mimeType: 'application/pdf',
    createdAt: '2026-09-16T12:00:00.000Z',
    folderId: null,
  },
  {
    id: 11,
    displayName: 'child.pdf',
    fileName: 'child.pdf',
    fileUrl: 'https://example.com/child.pdf',
    fileSize: 20,
    mimeType: 'application/pdf',
    createdAt: '2026-09-16T13:00:00.000Z',
    folderId: 1,
  },
];

describe('customerFileFolderModel', () => {
  it('starts at root and resets on customer change', () => {
    expect(createCustomerFolderNavState()).toEqual({ folderId: null });
    expect(resetCustomerFolderNavState()).toEqual({ folderId: null });
  });

  it('enters and leaves folders via parent navigation', () => {
    const entered = enterCustomerFolder(createCustomerFolderNavState(), 2);
    expect(entered.folderId).toBe(2);
    expect(leaveCustomerFolder(entered, folders).folderId).toBe(1);
    expect(leaveCustomerFolder({ folderId: 1 }, folders).folderId).toBeNull();
  });

  it('lists child folders and filters files for the current folder', () => {
    expect(listChildFolders(folders, null).map((folder) => folder.name)).toEqual([
      '보험청구',
      '계약서',
    ]);
    expect(listChildFolders(folders, 1).map((folder) => folder.name)).toEqual(['2026년']);
    expect(filterFilesForFolder(files, null).map((file) => file.id)).toEqual([10]);
    expect(filterFilesForFolder(files, 1).map((file) => file.id)).toEqual([11]);
  });

  it('builds breadcrumb for nested folders', () => {
    expect(buildCustomerFolderBreadcrumb(folders, 2).map((folder) => folder.name)).toEqual([
      '보험청구',
      '2026년',
    ]);
  });

  it('validates folder names using backend policy', () => {
    expect(validateCustomerFolderName('')).toMatch(/입력/);
    expect(validateCustomerFolderName('   ')).toMatch(/입력/);
    expect(validateCustomerFolderName('전체')).toMatch(/사용할 수 없는/);
    expect(validateCustomerFolderName('보험청구')).toBeNull();
    expect(validateCustomerFolderName('a'.repeat(13))).toMatch(/12자/);
  });
});

describe('customer folder isolation', () => {
  it('does not reuse another customer folder id in nav state reset', () => {
    const customerAState = enterCustomerFolder(createCustomerFolderNavState(), 2);
    const customerBState = resetCustomerFolderNavState();
    expect(customerAState.folderId).toBe(2);
    expect(customerBState.folderId).toBeNull();
  });
});
