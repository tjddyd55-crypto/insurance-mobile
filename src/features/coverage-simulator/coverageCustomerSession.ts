import { isScenarioRecord } from './scenarioEdits';
import type { CoverageScenario } from './types';

export type CoverageLinkedCustomer = {
  id: string | null;
  name: string | null;
  birthDate: string | null;
  phone: string | null;
};

type SavedSimulationCustomer = {
  id: string;
  name: string | null;
};

type ScenarioCustomerFields = Pick<
  CoverageScenario,
  'recordType' | 'customerId' | 'customerNameSnapshot' | 'customerName'
>;

/** 저장된 시뮬레이션의 고객. 템플릿이거나 id가 없으면 칩에 채우지 않는다. */
export function savedSimulationCustomer(
  scenario: ScenarioCustomerFields,
): SavedSimulationCustomer | null {
  if (isScenarioRecord(scenario)) return null;
  const id = scenario.customerId?.trim() ?? '';
  if (!id) return null;
  const snapshot = scenario.customerNameSnapshot?.trim() || scenario.customerName?.trim() || '';
  return { id, name: snapshot || null };
}

/**
 * 같은 고객이면 피커가 넣어 둔 생년월일·연락처를 유지한다.
 * 다른 고객이면 저장본의 id·이름만 칩에 올린다.
 */
export function hydrateCoverageCustomer(
  current: CoverageLinkedCustomer,
  saved: SavedSimulationCustomer,
): CoverageLinkedCustomer {
  if (current.id === saved.id) {
    return {
      id: saved.id,
      name: saved.name ?? current.name,
      birthDate: current.birthDate,
      phone: current.phone,
    };
  }
  return {
    id: saved.id,
    name: saved.name,
    birthDate: null,
    phone: null,
  };
}

export type CustomerVisitBaseline = {
  scenarioId: string;
  revision: number;
};

/** 시뮬레이션을 연 시점의 고객 변경 횟수. 그 이후에만 이번 방문의 선택으로 본다. */
export function rememberCustomerVisit(
  previous: CustomerVisitBaseline | null,
  scenarioId: string,
  revision: number,
): CustomerVisitBaseline {
  if (previous?.scenarioId === scenarioId) return previous;
  return { scenarioId, revision };
}

export function customerChangedThisVisit(visit: CustomerVisitBaseline, revision: number): boolean {
  return revision !== visit.revision;
}

export function sameCoverageCustomer(
  left: CoverageLinkedCustomer,
  right: CoverageLinkedCustomer,
): boolean {
  return left.id === right.id
    && left.name === right.name
    && left.birthDate === right.birthDate
    && left.phone === right.phone;
}

/**
 * 이번 편집 방문에서 고객을 고치거나 지우기 전에는 저장된 고객을 유지한다.
 * 방문 전 컨텍스트가 비어 있거나 다른 고객이어도 저장본을 지우지 않는다.
 */
export function resolveHeaderSaveCustomer(input: {
  explicit: boolean;
  context: { id: string | null; name: string | null };
  scenario: Pick<CoverageScenario, 'customerId' | 'customerNameSnapshot' | 'customerName'>;
}): { id: string | null; name: string | null } {
  if (input.explicit) {
    return { id: input.context.id, name: input.context.name };
  }
  const savedId = input.scenario.customerId ?? null;
  const savedName = input.scenario.customerNameSnapshot ?? input.scenario.customerName ?? null;
  if (savedId || savedName) {
    return { id: savedId, name: savedName };
  }
  return { id: input.context.id, name: input.context.name };
}
