import { buildSeedScenario } from '../scenarioSeed';
import { createSimulationFromScenario } from '../scenarioEdits';
import {
  COVERAGE_SIMULATION_HOME,
  coverageTemplateSimulationListPath,
  resolveCoverageEditorBackPath,
} from '../coverageSimulatorNavigation';

describe('coverageSimulatorNavigation', () => {
  it('builds template simulation list route', () => {
    expect(coverageTemplateSimulationListPath('tpl-1')).toBe(
      `${COVERAGE_SIMULATION_HOME}/templates/tpl-1/simulations`,
    );
  });

  it('returns home for scenario template editor back', () => {
    const seed = buildSeedScenario('cancer')!;
    expect(resolveCoverageEditorBackPath(seed)).toBe(COVERAGE_SIMULATION_HOME);
  });

  it('returns template simulation list for linked consultation', () => {
    const seed = buildSeedScenario('cancer')!;
    const simulation = createSimulationFromScenario(seed, { id: 'c1', name: '고객' });
    expect(resolveCoverageEditorBackPath(simulation)).toBe(
      coverageTemplateSimulationListPath(seed.id),
    );
  });
});
