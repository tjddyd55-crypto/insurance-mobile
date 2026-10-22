// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('ScenarioLibraryCrudPanel navigation', () => {
  it('opens simulation list on card tap instead of jumping to editor', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'ScenarioLibraryCrudPanel.tsx'),
      'utf8',
    );
    expect(source).toContain('openSimulationList');
    expect(source).toContain('coverageTemplateSimulationListPath');
    expect(source).not.toMatch(/onPress=\{\(\) => openEditor\(row\.id\)/);
  });
});
