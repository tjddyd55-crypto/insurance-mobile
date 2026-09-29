import {
  groupCustomersByCoordinate,
  hasNaverMapClientId,
  normalizeCustomerMap,
} from '../customerMapModel';

describe('customerMapModel', () => {
  test('normalizes and groups map customers', () => {
    const result = normalizeCustomerMap({
      mapCustomers: [
        { id: 1, name: 'A', latitude: 37.5, longitude: 127 },
        { id: 2, name: 'B', latitude: 37.5, longitude: 127 },
      ],
      map: { centerLat: 37.5, centerLng: 127 },
      stats: {},
    });
    expect(result.customers).toHaveLength(2);
    expect(groupCustomersByCoordinate(result.customers).size).toBe(1);
  });

  test('requires a non-empty naver map client id', () => {
    expect(hasNaverMapClientId(' naver-client ')).toBe(true);
    expect(hasNaverMapClientId('')).toBe(false);
    expect(hasNaverMapClientId(undefined)).toBe(false);
  });
});
