import { createScenarioFromTemplate, SCENARIO_TYPE_CARDS } from '../templates';

describe('coverage scenario templates', () => {
  it('exposes seed scenario cards for initial library', () => {
    expect(SCENARIO_TYPE_CARDS.every((card) => card.enabled)).toBe(true);
    expect(SCENARIO_TYPE_CARDS.some((card) => card.description.includes('준비 중'))).toBe(false);
    expect(SCENARIO_TYPE_CARDS.some((card) => card.description.includes('기본 예시 준비됨'))).toBe(false);
    expect(SCENARIO_TYPE_CARDS.find((card) => card.diseaseType === 'cancer')?.description).toContain('진단');
  });

  it('creates default items for every disease type', () => {
    for (const card of SCENARIO_TYPE_CARDS) {
      const scenario = createScenarioFromTemplate(card.diseaseType);
      expect(scenario).not.toBeNull();
      expect(scenario!.items.length).toBeGreaterThan(0);
      expect(scenario!.diseaseType).toBe(card.diseaseType);
    }
  });
});
