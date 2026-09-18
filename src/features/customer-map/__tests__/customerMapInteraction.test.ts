import {
  findCustomerMapSearchFocusGroup,
  resolveCustomerMapBridgeAction,
  shouldClearCustomerMapSelection,
} from '../customerMapInteraction';
import { buildCustomerMapMarkerGroups } from '../customerMapMarkerModel';
import type { CustomerMapItem } from '../types';

function customer(partial: Partial<CustomerMapItem> & Pick<CustomerMapItem, 'id' | 'name'>): CustomerMapItem {
  return {
    id: partial.id,
    name: partial.name,
    phone: partial.phone ?? '',
    address: partial.address ?? '',
    birthDateYmd: partial.birthDateYmd ?? null,
    gender: partial.gender ?? null,
    latitude: partial.latitude ?? 37.5,
    longitude: partial.longitude ?? 127,
    lastConsultDate: null,
    isFavorite: false,
    markerNo: partial.markerNo ?? partial.id,
  };
}

describe('customerMapInteraction', () => {
  const groups = buildCustomerMapMarkerGroups([
    customer({ id: 1, name: '김대문', latitude: 37.5, longitude: 127, markerNo: 1 }),
    customer({ id: 2, name: '김길', latitude: 37.5, longitude: 127, markerNo: 2 }),
    customer({ id: 3, name: '곽문영', latitude: 37.6, longitude: 127.1, markerNo: 3 }),
  ]);

  it('selects marker on first tap without navigation action', () => {
    const action = resolveCustomerMapBridgeAction(
      { type: 'marker_select', groupKey: groups[0].groupKey, customerId: 1, isGroup: true },
      groups,
    );
    expect(action).toEqual({
      type: 'select_group',
      group: groups[0],
      customerId: 1,
    });
  });

  it('clears selection on map click', () => {
    expect(resolveCustomerMapBridgeAction({ type: 'map_click' }, groups)).toEqual({
      type: 'clear_selection',
    });
  });

  it('focuses search matches without implying navigation', () => {
    const focusGroup = findCustomerMapSearchFocusGroup('곽문영', groups);
    expect(focusGroup?.customers[0].name).toBe('곽문영');
    expect(focusGroup?.count).toBe(1);
  });

  it('clears stale selection when filtered groups no longer include it', () => {
    expect(shouldClearCustomerMapSelection(groups[0].groupKey, [groups[1]])).toBe(true);
    expect(shouldClearCustomerMapSelection(groups[0].groupKey, groups)).toBe(false);
    expect(shouldClearCustomerMapSelection(null, groups)).toBe(false);
  });
});
