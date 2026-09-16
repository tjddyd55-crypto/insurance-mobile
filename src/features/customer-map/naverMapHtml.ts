import type { CustomerMapItem } from './types';

export type NaverMapMarkerGroup = {
  latitude: number;
  longitude: number;
  customers: CustomerMapItem[];
};

export function buildNaverMapMarkerGroups(
  customers: CustomerMapItem[],
): NaverMapMarkerGroup[] {
  const groups = new Map<string, NaverMapMarkerGroup>();
  for (const customer of customers) {
    const key = `${customer.latitude.toFixed(6)},${customer.longitude.toFixed(6)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.customers.push(customer);
      continue;
    }
    groups.set(key, {
      latitude: customer.latitude,
      longitude: customer.longitude,
      customers: [customer],
    });
  }
  return [...groups.values()];
}

export function buildNaverCustomerMapHtml(params: {
  clientId: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
  groups: NaverMapMarkerGroup[];
}): string {
  const { clientId, centerLat, centerLng, zoom, groups } = params;
  const markersJson = JSON.stringify(
    groups.map((group) => {
      const first = group.customers[0];
      const title =
        group.customers.length > 1
          ? `${first?.name ?? ''} 외 ${group.customers.length - 1}명`
          : first?.name ?? '';
      return {
        lat: group.latitude,
        lng: group.longitude,
        title,
        description: first?.address ?? '',
        customerId: first?.id ?? null,
      };
    }),
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #f3f4f6; }
    #error { display: none; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #374151; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="error"></div>
  <script>
    window.__insuranceMapMarkers = ${markersJson};
    window.navermap_authFailure = function () {
      var el = document.getElementById('error');
      el.style.display = 'block';
      el.textContent = '네이버 지도 인증에 실패했습니다. Client ID와 앱 설정을 확인해 주세요.';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth_failure' }));
      }
    };
    function postMessage(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function initMap() {
      if (!window.naver || !window.naver.maps) {
        var el = document.getElementById('error');
        el.style.display = 'block';
        el.textContent = '네이버 지도를 불러오지 못했습니다.';
        postMessage({ type: 'init_failure' });
        return;
      }
      var map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(${centerLat}, ${centerLng}),
        zoom: ${zoom},
        scaleControl: false,
        logoControl: true,
        mapDataControl: false,
      });
      (window.__insuranceMapMarkers || []).forEach(function (marker) {
        if (!marker || marker.customerId == null) return;
        var naverMarker = new naver.maps.Marker({
          position: new naver.maps.LatLng(marker.lat, marker.lng),
          map: map,
          title: marker.title,
        });
        var info = new naver.maps.InfoWindow({
          content: '<div style="padding:8px 10px;font-size:13px;line-height:1.4;">' +
            '<strong>' + String(marker.title || '').replace(/</g, '&lt;') + '</strong><br/>' +
            String(marker.description || '').replace(/</g, '&lt;') +
            '</div>',
        });
        naver.maps.Event.addListener(naverMarker, 'click', function () {
          info.open(map, naverMarker);
          postMessage({ type: 'marker_press', customerId: marker.customerId });
        });
      });
      postMessage({ type: 'ready' });
    }
  </script>
  <script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
    clientId,
  )}&callback=initMap" async defer onerror="window.navermap_authFailure && window.navermap_authFailure()"></script>
</body>
</html>`;
}
