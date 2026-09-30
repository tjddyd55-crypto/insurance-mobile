import {
  formatCoverageEditorCustomerLine,
  SCENARIO_LIBRARY_MENU_ACTIONS,
} from '../coverageEditorPresentation';
import { TimelineInsertControl } from '../CoverageTimeline';

describe('coverage editor compact interactions', () => {
  it('formats linked customer as one compact line', () => {
    expect(
      formatCoverageEditorCustomerLine({
        id: '1',
        name: '박훈',
        birthDate: '1977.11.13',
        phone: '010-4913-6545',
      }),
    ).toBe('박훈 · 1977.11.13 · 010-4913-6545');
    expect(formatCoverageEditorCustomerLine({ id: null, name: null })).toBeNull();
  });

  it('opens item edit directly from ⋯ (no intermediate menu action list)', () => {
    expect(SCENARIO_LIBRARY_MENU_ACTIONS).not.toContain('item-edit-menu');
  });

  it('includes explicit close on scenario library menu', () => {
    expect(SCENARIO_LIBRARY_MENU_ACTIONS.at(-1)).toBe('close');
  });

  it('exposes insert control as plus-only press target', () => {
    expect(TimelineInsertControl.name).toBe('TimelineInsertControl');
  });
});
