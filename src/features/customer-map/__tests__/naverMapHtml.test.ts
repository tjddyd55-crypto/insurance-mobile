import {
  buildNaverCustomerMapHtml,
  buildNaverMapMarkerGroups,
} from '../naverMapHtml';
import { hasGoogleMapsApiKey, hasNaverMapClientId } from '../customerMapModel';

describe('naver map html', () => {
  it('builds naver maps.js html without google maps references', () => {
    const html = buildNaverCustomerMapHtml({
      clientId: 'test-client-id',
      centerLat: 37.5665,
      centerLng: 126.978,
      zoom: 12,
      groups: buildNaverMapMarkerGroups([
        {
          id: 1,
          name: '문해자',
          phone: '010',
          address: '서울',
          latitude: 37.5,
          longitude: 127,
          lastConsultDate: null,
          isFavorite: false,
          markerNo: 1,
        },
      ]),
    });

    expect(html).toContain('oapi.map.naver.com/openapi/v3/maps.js');
    expect(html).toContain('ncpKeyId=test-client-id');
    expect(html).toContain('customer-map-name-marker__label');
    expect(html).toContain('marker_select');
    expect(html).toContain('map_click');
    expect(html).not.toContain('Google Maps');
    expect(html).not.toContain('marker_press');
  });

  it('uses naver client id gate instead of google maps key', () => {
    expect(hasNaverMapClientId(' naver-id ')).toBe(true);
    expect(hasNaverMapClientId('')).toBe(false);
    expect(hasGoogleMapsApiKey()).toBe(false);
  });
});
