import { readFileSync } from 'fs';
import { join } from 'path';
import { buildSeedScenario } from '../scenarioSeed';
import { createSimulationFromScenario } from '../scenarioEdits';
import {
  COVERAGE_SIMULATION_HOME,
  coverageEditorBackPath,
  resolveCoverageEditorBackPath,
} from '../coverageSimulatorNavigation';

describe('P2-3 simulation editor back uses origin', () => {
  const sim = createSimulationFromScenario(buildSeedScenario('cancer')!, { id: '12', name: 'x' });
  it('customer workspace origin returns to that customer list', () => {
    expect(coverageEditorBackPath(sim, '12')).toBe('/customers/12/coverage-simulations');
    expect(coverageEditorBackPath(undefined, ['12'])).toBe('/customers/12/coverage-simulations');
  });
  it('no origin keeps existing coverage list policy; never "/"', () => {
    expect(coverageEditorBackPath(sim, undefined)).toBe(resolveCoverageEditorBackPath(sim));
    expect(coverageEditorBackPath(sim, '../x')).toBe(resolveCoverageEditorBackPath(sim));
    expect(coverageEditorBackPath(undefined, undefined)).toBe(COVERAGE_SIMULATION_HOME);
  });
  it('editor wires hardware back + header back to origin; customer screen passes origin', () => {
    const ed = readFileSync(join(__dirname, '../CoverageSimulationScreen.tsx'), 'utf8');
    expect(ed).toContain("addEventListener('hardwareBackPress'");
    expect(ed).toContain('onBackPress={goBackToOrigin}');
    const cw = readFileSync(join(__dirname, '../../customer-workspace/CustomerCoverageSimulationsScreen.tsx'), 'utf8');
    expect(cw).toContain('?fromCustomerId=${customerIdStr}');
  });
});
