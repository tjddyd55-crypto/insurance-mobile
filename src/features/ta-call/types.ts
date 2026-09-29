export type TaCallStatus = 'not_called' | 'completed' | 'no_answer';
export type TaTargetGender = 'all' | 'male' | 'female';

export type TaCallAssignment = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerBirthDate: string | null;
  customerGender: string;
  status: TaCallStatus;
};

export type TaCallDay = {
  date: string;
  dailyTargetCount: number;
  totalCount: number;
  completedCount: number;
  noAnswerCount: number;
  notCalledCount: number;
  isToday: boolean;
  isFuture: boolean;
  isMissionCompleted: boolean;
  assignments: TaCallAssignment[];
  emptyMessage: string | null;
  emptySubMessage: string | null;
};

export type TaCallWeek = {
  weekStartDate: string;
  weekEndDate: string;
  dailyTargetCount: number;
  targetFilterSummary: string | null;
  days: TaCallDay[];
};

export type TaCallSettings = {
  dailyTargetCount: number;
  targetGender: TaTargetGender;
  targetSangnyeongDays: number | null;
  targetInsuranceAgeMin: number | null;
  targetInsuranceAgeMax: number | null;
  excludeMinors: boolean;
  updatedAt: string | null;
};
