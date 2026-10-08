import { buildSeedScenario } from '../scenarioSeed';
import { createSimulationFromScenario } from '../scenarioEdits';
import {
  COVERAGE_SIMULATION_HOME,
  coverageTemplateSimulationListPath,
  leaveCoverageEditor,
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

  it('pops the stack when leaving the editor with history', () => {
    const seed = buildSeedScenario('cancer')!;
    const simulation = createSimulationFromScenario(seed, { id: 'c1', name: '고객' });
    const back = jest.fn();
    const replace = jest.fn();
    leaveCoverageEditor({ back, replace, canGoBack: () => true }, simulation);
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces with fallback when there is no stack history', () => {
    const seed = buildSeedScenario('cancer')!;
    const simulation = createSimulationFromScenario(seed, { id: 'c1', name: '고객' });
    const back = jest.fn();
    const replace = jest.fn();
    leaveCoverageEditor({ back, replace, canGoBack: () => false }, simulation);
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(coverageTemplateSimulationListPath(seed.id));
  });
});
