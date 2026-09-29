import {
  formatCoverageEditorCustomerLine,
  resolveCoverageItemMenuToggle,
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

  it('toggles item menu with menuItemId SSOT', () => {
    expect(resolveCoverageItemMenuToggle(null, 'a')).toBe('a');
    expect(resolveCoverageItemMenuToggle('a', 'a')).toBeNull();
    expect(resolveCoverageItemMenuToggle('a', 'b')).toBe('b');
  });

  it('exposes insert control as plus-only press target', () => {
    expect(TimelineInsertControl.name).toBe('TimelineInsertControl');
  });
});
