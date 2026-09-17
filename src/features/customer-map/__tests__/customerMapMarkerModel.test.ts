import {
  buildCustomerMapMarkerGroups,
  buildGroupMarkerLabel,
  buildCustomerMapGroupMarkerHtml,
} from '../customerMapMarkerModel';
import type { CustomerMapItem } from '../types';

function customer(partial: Partial<CustomerMapItem> & Pick<CustomerMapItem, 'id' | 'name'>): CustomerMapItem {
  return {
    id: partial.id,
    name: partial.name,
    phone: partial.phone ?? '',
    address: partial.address ?? '',
    latitude: partial.latitude ?? 37.5,
    longitude: partial.longitude ?? 127,
    lastConsultDate: null,
    isFavorite: false,
    markerNo: partial.markerNo ?? partial.id,
  };
}

describe('customerMapMarkerModel', () => {
  test('groups customers by coordinate precision', () => {
    const groups = buildCustomerMapMarkerGroups([
      customer({ id: 1, name: '김ONE', latitude: 37.5, longitude: 127, markerNo: 1 }),
      customer({ id: 2, name: '이TWO', latitude: 37.5, longitude: 127, markerNo: 2 }),
      customer({ id: 3, name: '박THREE', latitude: 37.6, longitude: 127.1, markerNo: 3 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(2);
  });

  test('builds group label like web', () => {
    expect(buildGroupMarkerLabel([customer({ id: 1, name: '김길' })])).toBe('김길');
    expect(
      buildGroupMarkerLabel([
        customer({ id: 1, name: '김길' }),
        customer({ id: 2, name: '이순' }),
      ]),
    ).toBe('김길 외 1명');
  });

  test('renders name marker html with count badge for groups', () => {
    const html = buildCustomerMapGroupMarkerHtml('김길 외 1명', 2, true);
    expect(html).toContain('customer-map-name-marker--selected');
    expect(html).toContain('customer-map-name-marker--group');
    expect(html).toContain('customer-map-name-marker__count');
  });
});
