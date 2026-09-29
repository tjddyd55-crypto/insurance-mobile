import {
  buildCustomerMapMarkerGroups,
  buildGroupMarkerLabel,
  CUSTOMER_MAP_NAME_MARKER_SIZE,
  type CustomerMapMarkerGroup,
} from './customerMapMarkerModel';
import type { CustomerMapItem } from './types';

export { buildCustomerMapMarkerGroups };

/** @deprecated use buildCustomerMapMarkerGroups */
export function buildNaverMapMarkerGroups(customers: CustomerMapItem[]): CustomerMapMarkerGroup[] {
  return buildCustomerMapMarkerGroups(customers);
}

export type NaverMapMarkerGroup = CustomerMapMarkerGroup;

const MARKER_CSS = `
.customer-map-name-marker {
  width: 120px;
  height: 44px;
  position: relative;
  box-sizing: border-box;
  overflow: visible;
  pointer-events: auto;
}
.customer-map-name-marker__label {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  max-width: 112px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #111827;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
}
.customer-map-name-marker__pin {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #16a34a;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}
.customer-map-name-marker--selected .customer-map-name-marker__label {
  background: #1e3a8a;
  border-color: #60a5fa;
  color: #ffffff;
}
.customer-map-name-marker--selected .customer-map-name-marker__pin {
  background: #60a5fa;
  border-color: #dbeafe;
}
.customer-map-name-marker--group .customer-map-name-marker__label {
  padding-right: 22px;
}
.customer-map-name-marker__count {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #16a34a;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
`;

function serializeMarkerHtmlBuilder(): string {
  return `
function buildMarkerHtml(label, count, selected) {
  var modifier = selected ? ' customer-map-name-marker--selected' : '';
  var groupModifier = count > 1 ? ' customer-map-name-marker--group' : '';
  var escaped = String(label || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  var countBadge = count > 1 ? '<span class="customer-map-name-marker__count">' + String(count) + '</span>' : '';
  return '<div class="customer-map-name-marker' + modifier + groupModifier + '"><div class="customer-map-name-marker__label">' + escaped + countBadge + '</div><div class="customer-map-name-marker__pin" aria-hidden="true"></div></div>';
}`;
}

export function buildNaverCustomerMapHtml(params: {
  clientId: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
  groups: CustomerMapMarkerGroup[];
  selectedGroupKey?: string | null;
}): string {
  const { clientId, centerLat, centerLng, zoom, groups, selectedGroupKey = null } = params;
  const markersJson = JSON.stringify(
    groups.map((group) => ({
      groupKey: group.groupKey,
      lat: group.latitude,
      lng: group.longitude,
      label: buildGroupMarkerLabel(group.customers),
      count: group.count,
      customerId: group.customers[0]?.id ?? null,
      selected: group.groupKey === selectedGroupKey,
    })),
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #f3f4f6; }
    #error { display: none; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #374151; }
    ${MARKER_CSS}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="error"></div>
  <script>
    window.__insuranceMapMarkers = ${markersJson};
    window.__insuranceMapState = { map: null, markers: [] };
    ${serializeMarkerHtmlBuilder()}
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
    function clearMarkers() {
      var state = window.__insuranceMapState;
      (state.markers || []).forEach(function (marker) {
        marker.setMap(null);
      });
      state.markers = [];
    }
    function initMap() {
      var attempts = 0;
      function boot() {
        if (window.naver && window.naver.maps) {
          renderMap();
          return;
        }
        if (++attempts > 40) {
          var el = document.getElementById('error');
          el.style.display = 'block';
          el.textContent = '네이버 지도를 불러오지 못했습니다.';
          postMessage({ type: 'init_failure' });
          return;
        }
        setTimeout(boot, 100);
      }
      function renderMap() {
        var map = new naver.maps.Map('map', {
          center: new naver.maps.LatLng(${centerLat}, ${centerLng}),
          zoom: ${zoom},
          scaleControl: false,
          logoControl: true,
          mapDataControl: false,
        });
        window.__insuranceMapState.map = map;
        clearMarkers();
        (window.__insuranceMapMarkers || []).forEach(function (markerData) {
          if (!markerData || markerData.customerId == null) return;
          var marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(markerData.lat, markerData.lng),
            map: map,
            zIndex: markerData.selected ? 200 : 100,
            icon: {
              content: buildMarkerHtml(markerData.label, markerData.count, markerData.selected),
              size: new naver.maps.Size(${CUSTOMER_MAP_NAME_MARKER_SIZE.width}, ${CUSTOMER_MAP_NAME_MARKER_SIZE.height}),
              anchor: new naver.maps.Point(${CUSTOMER_MAP_NAME_MARKER_SIZE.anchorX}, ${CUSTOMER_MAP_NAME_MARKER_SIZE.anchorY}),
            },
          });
          naver.maps.Event.addListener(marker, 'click', function (event) {
            if (event && event.domEvent && event.domEvent.stopPropagation) {
              event.domEvent.stopPropagation();
            }
            postMessage({
              type: 'marker_select',
              groupKey: markerData.groupKey,
              customerId: markerData.customerId,
              isGroup: markerData.count > 1,
            });
          });
          window.__insuranceMapState.markers.push(marker);
        });
        naver.maps.Event.addListener(map, 'click', function () {
          postMessage({ type: 'map_click' });
        });
        postMessage({ type: 'ready' });
      }
      boot();
    }
    window.__handleNativeCommand = function (command) {
      var map = window.__insuranceMapState && window.__insuranceMapState.map;
      if (!map || !command || !command.type) return;
      if (command.type === 'pan_to' && command.lat != null && command.lng != null) {
        map.setCenter(new naver.maps.LatLng(command.lat, command.lng));
        if (command.zoom != null) {
          map.setZoom(command.zoom);
        }
      }
    };
    document.addEventListener('message', function (event) {
      try {
        window.__handleNativeCommand(JSON.parse(event.data));
      } catch (e) {}
    });
    window.addEventListener('message', function (event) {
      try {
        window.__handleNativeCommand(JSON.parse(event.data));
      } catch (e) {}
    });
  </script>
  <script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
    clientId,
  )}&callback=initMap" async defer onerror="window.navermap_authFailure && window.navermap_authFailure()"></script>
</body>
</html>`;
}
