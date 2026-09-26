import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type CoverageCustomer = { id: string | null; name: string | null };

type CoverageCustomerContextValue = CoverageCustomer & {
  setCustomer: (customer: CoverageCustomer) => void;
};

const CoverageCustomerContext = createContext<CoverageCustomerContextValue | null>(null);

export function CoverageCustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CoverageCustomer>({ id: null, name: null });
  const value = useMemo(
    () => ({ ...customer, setCustomer }),
    [customer],
  );
  return <CoverageCustomerContext.Provider value={value}>{children}</CoverageCustomerContext.Provider>;
}

export function useCoverageCustomer(): CoverageCustomerContextValue {
  const value = useContext(CoverageCustomerContext);
  if (!value) {
    return { id: null, name: null, setCustomer: () => undefined };
  }
  return value;
}
