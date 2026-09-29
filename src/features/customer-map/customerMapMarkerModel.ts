import type { CustomerMapItem } from './types';

export const COORDINATE_GROUP_PRECISION = 6;

export const CUSTOMER_MAP_NAME_MARKER_SIZE = {
  width: 120,
  height: 44,
  anchorX: 60,
  anchorY: 40,
} as const;

export type CustomerMapMarkerGroup = {
  groupKey: string;
  latitude: number;
  longitude: number;
  address: string;
  customers: CustomerMapItem[];
  count: number;
};

export function buildCoordinateGroupKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_GROUP_PRECISION)},${longitude.toFixed(COORDINATE_GROUP_PRECISION)}`;
}

export function buildCustomerMapMarkerGroups(customers: CustomerMapItem[]): CustomerMapMarkerGroup[] {
  const byKey = new Map<string, CustomerMapItem[]>();
  for (const customer of customers) {
    const key = buildCoordinateGroupKey(customer.latitude, customer.longitude);
    const bucket = byKey.get(key) ?? [];
    bucket.push(customer);
    byKey.set(key, bucket);
  }

  return [...byKey.entries()].map(([groupKey, groupCustomers]) => {
    const [latText, lngText] = groupKey.split(',');
    const sorted = [...groupCustomers].sort((a, b) => a.markerNo - b.markerNo);
    return {
      groupKey,
      latitude: Number(latText),
      longitude: Number(lngText),
      address: sorted[0]?.address?.trim() ?? '',
      customers: sorted,
      count: sorted.length,
    };
  });
}

export function findMarkerGroupByCustomerId(
  groups: CustomerMapMarkerGroup[],
  customerId: number,
): CustomerMapMarkerGroup | null {
  return groups.find((group) => group.customers.some((customer) => customer.id === customerId)) ?? null;
}

const MAX_MARKER_LABEL_CHARS = 12;

export function truncateMarkerLabel(name: string): string {
  const trimmed = name.trim() || '이름 없음';
  if (trimmed.length <= MAX_MARKER_LABEL_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_MARKER_LABEL_CHARS)}…`;
}

export function buildGroupMarkerLabel(customers: CustomerMapItem[]): string {
  if (customers.length === 0) {
    return '이름 없음';
  }
  if (customers.length === 1) {
    return customers[0].name.trim() || '이름 없음';
  }
  const firstName = customers[0].name.trim() || '이름 없음';
  const suffix = ` 외 ${customers.length - 1}명`;
  if (`${firstName}${suffix}`.length <= MAX_MARKER_LABEL_CHARS) {
    return `${firstName}${suffix}`;
  }
  return `${customers.length}명`;
}

export function escapeMarkerLabelHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCustomerMapGroupMarkerHtml(
  label: string,
  count: number,
  selected: boolean,
): string {
  const modifier = selected ? ' customer-map-name-marker--selected' : '';
  const groupModifier = count > 1 ? ' customer-map-name-marker--group' : '';
  const escapedLabel = escapeMarkerLabelHtml(truncateMarkerLabel(label));
  const countBadge =
    count > 1
      ? `<span class="customer-map-name-marker__count">${escapeMarkerLabelHtml(String(count))}</span>`
      : '';
  return `<div class="customer-map-name-marker${modifier}${groupModifier}"><div class="customer-map-name-marker__label">${escapedLabel}${countBadge}</div><div class="customer-map-name-marker__pin" aria-hidden="true"></div></div>`;
}
