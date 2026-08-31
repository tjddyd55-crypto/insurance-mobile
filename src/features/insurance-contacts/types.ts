export type InsuranceCategory = 'LIFE' | 'NON_LIFE' | 'GENERAL';

export type CompanyContact = { id: number; name: string; position: string; phone: string };

export type CompanyDirectoryEntry = {
  id: number;
  companyCode: string;
  category: string;
  name: string;
  customerCenter: string;
  systemPhone: string;
  incallNumber: string;
  visitInfo: string;
  contacts: CompanyContact[];
};
