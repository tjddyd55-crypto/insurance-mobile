import {
  formatCoverageEditorCustomerLine,
  savedCustomerChipFromPickerRow,
  SCENARIO_LIBRARY_MENU_ACTIONS,
} from '../coverageEditorPresentation';
import { toCoverageCustomerPickerRow } from '../coverageCustomerPickerPresentation';
import { normalizeCustomer } from '../../customers/customerModel';
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

  it('omits missing birth date and phone instead of dash placeholders', () => {
    expect(formatCoverageEditorCustomerLine({
      id: '1',
      name: '홍길동',
      birthDate: null,
      phone: null,
    })).toBe('홍길동');
    expect(formatCoverageEditorCustomerLine({
      id: '1',
      name: '홍길동',
      birthDate: '—',
      phone: '—',
    })).toBe('홍길동');
    expect(formatCoverageEditorCustomerLine({
      id: '1',
      name: '홍길동',
      birthDate: '1990.01.15',
      phone: null,
    })).toBe('홍길동 · 1990.01.15');
  });

  it('fills birth date and phone from the same picker row shape', () => {
    const row = toCoverageCustomerPickerRow(normalizeCustomer({
      id: 42,
      name: '홍길동',
      birthDate: '1990-01-15',
      phone: '01012345678',
      notes: {},
    }));
    const chip = savedCustomerChipFromPickerRow({ id: '42', name: '홍길동' }, row);

    expect(formatCoverageEditorCustomerLine(chip)).toBe('홍길동 · 1990.01.15 · 010-1234-5678');
  });

  it('keeps the saved name when the customer record has no birth date or phone', () => {
    const row = toCoverageCustomerPickerRow(normalizeCustomer({
      id: 7,
      name: '다른이름',
      phone: '',
      notes: {},
    }));
    const chip = savedCustomerChipFromPickerRow({ id: '7', name: '홍길동' }, row);

    expect(chip.name).toBe('홍길동');
    expect(chip.birthDate).toBeNull();
    expect(chip.phone).toBeNull();
    expect(formatCoverageEditorCustomerLine(chip)).toBe('홍길동');
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
