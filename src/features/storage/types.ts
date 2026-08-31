export type StorageFolder = { id: number; name: string; parentId: number | null; createdAt: string };
export type StorageFile = { id: number; folderId: number | null; displayName: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string | null; createdAt: string };
export type StorageQuota = { usedBytes: number; limitBytes: number; pendingUploadBytes: number };
