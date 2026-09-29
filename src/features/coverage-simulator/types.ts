export type DiseaseType =
  | 'cancer'
  | 'cerebrovascular'
  | 'heart'
  | 'care-dementia'
  | 'fracture-surgery'
  | 'custom';

export type ScenarioItemCategory = 'diagnosis' | 'treatment' | 'recovery' | 'support' | 'other';

export type CoverageScenarioItem = {
  id: string;
  type: 'coverage';
  category: ScenarioItemCategory;
  label: string;
  currentAmount: number | null;
  proposedAmount: number | null;
  memo?: string;
  order: number;
  favorite?: boolean;
};

export type TimeMarkerScenarioItem = {
  id: string;
  type: 'time-marker';
  label: string;
  order: number;
};

export type ScenarioItem = CoverageScenarioItem | TimeMarkerScenarioItem;

/** `scenario` = reusable template library. `simulation` = customer-linked saved run. */
export type CoverageRecordType = 'scenario' | 'simulation';

export type CoverageScenario = {
  id: string;
  title: string;
  diseaseType: DiseaseType;
  description: string;
  customerId?: string | null;
  customerNameSnapshot?: string | null;
  customerName?: string;
  consultationDate: string;
  items: ScenarioItem[];
  createdAt: string;
  updatedAt: string;
  kind?: 'consultation';
  recordType?: CoverageRecordType;
  /** Present only for idempotent initial seeds (e.g. seed:cancer). */
  seedKey?: string;
  templateId?: string;
  templateNameSnapshot?: string;
};

export type SavedScenarioSummary = {
  id: string;
  title: string;
  diseaseType: DiseaseType;
  customerId?: string | null;
  customerNameSnapshot?: string | null;
  customerName?: string;
  consultationDate: string;
  createdAt: string;
  updatedAt: string;
};
