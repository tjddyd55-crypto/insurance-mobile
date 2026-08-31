export type AccountCategory = 'LIFE' | 'NON_LIFE' | 'GENERAL';
export type AccountVaultRow = {
  id: string; category: AccountCategory; companyName: string; loginId: string; loginPassword: string;
  memo: string; sortOrder: number; isCustom: boolean; isArchived: boolean; updatedAt: string;
};
