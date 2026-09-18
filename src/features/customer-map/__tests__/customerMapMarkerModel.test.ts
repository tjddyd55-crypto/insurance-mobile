import {
  buildCoordinateGroupKey,
  buildCustomerMapMarkerGroups,
  buildGroupMarkerLabel,
  buildCustomerMapGroupMarkerHtml,
  truncateMarkerLabel,
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

  test('builds web-aligned labels for single, pair, and triple groups', () => {
    expect(buildGroupMarkerLabel([customer({ id: 1, name: '김대문' })])).toBe('김대문');
    expect(
      buildGroupMarkerLabel([
        customer({ id: 1, name: '김길' }),
        customer({ id: 2, name: '이순' }),
      ]),
    ).toBe('김길 외 1명');
    expect(
      buildGroupMarkerLabel([
        customer({ id: 1, name: '곽문영' }),
        customer({ id: 2, name: '김길' }),
        customer({ id: 3, name: '이순' }),
      ]),
    ).toBe('곽문영 외 2명');
  });

  test('groups by coordinate precision only', () => {
    const keyA = buildCoordinateGroupKey(37.5000004, 127.0000004);
    const keyB = buildCoordinateGroupKey(37.5000005, 127.0000005);
    expect(keyA).toBe(keyB);
    const groups = buildCustomerMapMarkerGroups([
      customer({ id: 1, name: 'A', latitude: 37.5000004, longitude: 127.0000004 }),
      customer({ id: 2, name: 'B', latitude: 37.5000005, longitude: 127.0000005 }),
      customer({ id: 3, name: 'C', latitude: 37.5000015, longitude: 127.0000015 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.count === 2)?.customers.map((row) => row.name)).toEqual([
      'A',
      'B',
    ]);
  });

  test('falls back to count-only label when name plus suffix exceeds 12 chars', () => {
    expect(
      buildGroupMarkerLabel([
        customer({ id: 1, name: '아주긴고객이름입니다' }),
        customer({ id: 2, name: 'B' }),
      ]),
    ).toBe('2명');
    expect(truncateMarkerLabel('아주아주아주긴고객이름입니다')).toBe('아주아주아주긴고객이름입…');
  });

  test('does not render count badge for single marker html', () => {
    const html = buildCustomerMapGroupMarkerHtml('김대문', 1, false);
    expect(html).not.toContain('customer-map-name-marker__count');
    expect(html).not.toContain('customer-map-name-marker--group');
  });
});
