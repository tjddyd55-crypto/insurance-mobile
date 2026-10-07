import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  sameCoverageCustomer,
  type CoverageLinkedCustomer,
} from './coverageCustomerSession';

type CoverageCustomerContextValue = CoverageLinkedCustomer & {
  /** setCustomer가 호출된 횟수. 편집 화면은 연 시점과 비교해 이번 방문을 구분한다. */
  customerRevision: number;
  setCustomer: (customer: CoverageLinkedCustomer) => void;
  hydrateCustomer: (customer: CoverageLinkedCustomer) => void;
};

const EMPTY_CUSTOMER: CoverageLinkedCustomer = {
  id: null,
  name: null,
  birthDate: null,
  phone: null,
};

const CoverageCustomerContext = createContext<CoverageCustomerContextValue | null>(null);

export function CoverageCustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomerState] = useState<CoverageLinkedCustomer>(EMPTY_CUSTOMER);
  const [customerRevision, setCustomerRevision] = useState(0);

  const setCustomer = useCallback((next: CoverageLinkedCustomer) => {
    setCustomerRevision((revision) => revision + 1);
    setCustomerState(next);
  }, []);

  const hydrateCustomer = useCallback((next: CoverageLinkedCustomer) => {
    setCustomerState((current) => (sameCoverageCustomer(current, next) ? current : next));
  }, []);

  const value = useMemo(
    () => ({
      ...customer,
      customerRevision,
      setCustomer,
      hydrateCustomer,
    }),
    [customer, customerRevision, hydrateCustomer, setCustomer],
  );

  return <CoverageCustomerContext.Provider value={value}>{children}</CoverageCustomerContext.Provider>;
}

export function useCoverageCustomer(): CoverageCustomerContextValue {
  const value = useContext(CoverageCustomerContext);
  if (!value) {
    return {
      ...EMPTY_CUSTOMER,
      customerRevision: 0,
      setCustomer: () => undefined,
      hydrateCustomer: () => undefined,
    };
  }
  return value;
}
