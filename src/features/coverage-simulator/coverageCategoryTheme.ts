import type { ScenarioItemCategory } from './types';
import { simulatorTheme } from './simulatorTheme';

/**
 * Category badge colors — keep in sync with web `onefc-token-bridge.css` / `categoryBadgeTheme.css`.
 * Web SSOT path: insurance/src/features/coverage-simulator/styles/categoryBadgeTheme.css
 */
export function getCoverageCategoryTheme(category: ScenarioItemCategory): { bg: string; fg: string } {
  return simulatorTheme.badge[category];
}
