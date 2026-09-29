export type InsurerSiteCategory = 'non_life' | 'life';

export type InsurerSite = {
  id: number;
  category: InsurerSiteCategory;
  name: string;
  logoPath: string;
  salesUrl: string;
  homepageUrl: string;
  disclosureUrl: string;
  claimUrl: string;
  sortOrder: number;
  isActive: boolean;
};
