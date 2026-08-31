import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { getTheme, type AppTheme, type ThemeScheme } from './themes';

export type ThemeMode = ThemeScheme | 'system';

type DesignSystemContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedScheme: ThemeScheme;
  setMode: (mode: ThemeMode) => void;
};

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

type DesignSystemProviderProps = {
  children: ReactNode;
  /** Light remains the product default until every legacy M1 screen is theme-aware. */
  initialMode?: ThemeMode;
};

export function DesignSystemProvider({
  children,
  initialMode = 'light',
}: DesignSystemProviderProps) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const resolvedScheme: ThemeScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(
    () => ({ theme: getTheme(resolvedScheme), mode, resolvedScheme, setMode }),
    [mode, resolvedScheme],
  );

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>;
}

export function useDesignSystem(): DesignSystemContextValue {
  const value = useContext(DesignSystemContext);
  if (!value) {
    throw new Error('useDesignSystem must be used inside DesignSystemProvider');
  }
  return value;
}

export function useAppTheme(): AppTheme {
  return useDesignSystem().theme;
}
