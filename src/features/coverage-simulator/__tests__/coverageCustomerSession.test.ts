import { formatCoverageEditorCustomerLine } from '../coverageEditorPresentation';
import {
  customerChangedThisVisit,
  hydrateCoverageCustomer,
  rememberCustomerVisit,
  resolveHeaderSaveCustomer,
  savedSimulationCustomer,
  type CoverageLinkedCustomer,
} from '../coverageCustomerSession';
import { assignCustomer } from '../scenarioEdits';
import type { CoverageScenario } from '../types';

const emptyCustomer: CoverageLinkedCustomer = {
  id: null,
  name: null,
  birthDate: null,
  phone: null,
};

function scenario(patch: Partial<CoverageScenario> = {}): CoverageScenario {
  return {
    id: 'sim-1',
    title: '암 플랜',
    diseaseType: 'cancer',
    description: '',
    customerId: 'c-1',
    customerNameSnapshot: '홍길동',
    consultationDate: '2026-09-30',
    items: [],
    createdAt: '',
    updatedAt: '',
    recordType: 'simulation',
    ...patch,
  };
}

describe('saved simulation customer chip', () => {
  it('hydrates the editor chip from the saved customer id and name', () => {
    const saved = savedSimulationCustomer(scenario());
    const hydrated = hydrateCoverageCustomer(emptyCustomer, saved!);

    expect(hydrated).toEqual({
      id: 'c-1',
      name: '홍길동',
      birthDate: null,
      phone: null,
    });
    expect(formatCoverageEditorCustomerLine(hydrated)).toBe('홍길동 · — · —');
  });

  it('keeps birth date and phone when the saved customer is already selected', () => {
    const hydrated = hydrateCoverageCustomer(
      {
        id: 'c-1',
        name: '홍길동',
        birthDate: '1977.11.13',
        phone: '010-4913-6545',
      },
      { id: 'c-1', name: '홍길동' },
    );

    expect(formatCoverageEditorCustomerLine(hydrated)).toBe('홍길동 · 1977.11.13 · 010-4913-6545');
  });

  it('replaces the chip when the saved simulation belongs to another customer', () => {
    const hydrated = hydrateCoverageCustomer(
      {
        id: 'c-old',
        name: '김이전',
        birthDate: '1990.01.01',
        phone: '010-0000-0000',
      },
      { id: 'c-1', name: '홍길동' },
    );

    expect(hydrated.id).toBe('c-1');
    expect(hydrated.name).toBe('홍길동');
    expect(hydrated.birthDate).toBeNull();
  });

  it('does not invent a chip for a template or a simulation without a customer id', () => {
    expect(savedSimulationCustomer(scenario({ recordType: 'scenario' }))).toBeNull();
    expect(savedSimulationCustomer(scenario({ customerId: null, customerNameSnapshot: '홍길동' }))).toBeNull();
    expect(savedSimulationCustomer(scenario({ customerId: '  ' }))).toBeNull();
  });
});

describe('customer visit baseline', () => {
  it('treats a customer picked after the simulation opens as an explicit change', () => {
    const opened = rememberCustomerVisit(null, 'sim-1', 0);
    expect(customerChangedThisVisit(opened, 0)).toBe(false);

    const picked = rememberCustomerVisit(opened, 'sim-1', 1);
    expect(customerChangedThisVisit(picked, 1)).toBe(true);
  });

  it('starts a new visit when another simulation opens, even if a customer was already picked', () => {
    const first = rememberCustomerVisit(null, 'sim-1', 2);
    const next = rememberCustomerVisit(first, 'sim-2', 2);

    expect(next).toEqual({ scenarioId: 'sim-2', revision: 2 });
    expect(customerChangedThisVisit(next, 2)).toBe(false);
  });
});

describe('header save customer', () => {
  it('keeps the saved customer when this visit has not changed it', () => {
    const original = scenario();
    const kept = resolveHeaderSaveCustomer({
      explicit: false,
      context: emptyCustomer,
      scenario: original,
    });
    const saved = assignCustomer(original, kept);

    expect(saved.customerId).toBe('c-1');
    expect(saved.customerNameSnapshot).toBe('홍길동');
  });

  it('keeps the saved customer even if the in-memory context points at someone else', () => {
    const kept = resolveHeaderSaveCustomer({
      explicit: false,
      context: { id: 'c-other', name: '다른고객' },
      scenario: scenario(),
    });

    expect(kept).toEqual({ id: 'c-1', name: '홍길동' });
  });

  it('writes the customer the user picked in this visit', () => {
    const picked = resolveHeaderSaveCustomer({
      explicit: true,
      context: { id: 'c-2', name: '김철수' },
      scenario: scenario(),
    });

    expect(picked).toEqual({ id: 'c-2', name: '김철수' });
  });

  it('clears the saved customer when the user removed it in this visit', () => {
    const original = scenario();
    const cleared = resolveHeaderSaveCustomer({
      explicit: true,
      context: { id: null, name: null },
      scenario: original,
    });
    const saved = assignCustomer(original, cleared);

    expect(saved.customerId).toBeNull();
    expect(saved.customerNameSnapshot).toBeNull();
  });

  it('uses the in-memory customer when the simulation has none and the user did not edit it here', () => {
    const linked = resolveHeaderSaveCustomer({
      explicit: false,
      context: { id: 'c-2', name: '김철수' },
      scenario: scenario({ customerId: null, customerNameSnapshot: null, customerName: undefined }),
    });

    expect(linked).toEqual({ id: 'c-2', name: '김철수' });
  });
});
