import type { CustomerMapMarkerGroup } from './customerMapMarkerModel';
import type { NaverMapBridgeMessage } from './NaverCustomerMapView';

export type CustomerMapBridgeAction =
  | { type: 'clear_selection' }
  | { type: 'select_group'; group: CustomerMapMarkerGroup; customerId: number }
  | { type: 'noop' };

export function resolveCustomerMapBridgeAction(
  message: NaverMapBridgeMessage,
  groups: CustomerMapMarkerGroup[],
): CustomerMapBridgeAction {
  if (message.type === 'map_click') {
    return { type: 'clear_selection' };
  }
  if (message.type !== 'marker_select') {
    return { type: 'noop' };
  }
  const group = groups.find((item) => item.groupKey === message.groupKey);
  if (!group) {
    return { type: 'noop' };
  }
  return { type: 'select_group', group, customerId: message.customerId };
}

export function findCustomerMapSearchFocusGroup(
  keyword: string,
  groups: CustomerMapMarkerGroup[],
): CustomerMapMarkerGroup | null {
  const trimmed = keyword.trim();
  if (!trimmed || groups.length === 0) {
    return null;
  }
  return (
    groups.find((group) =>
      group.customers.some((customer) => customer.name.includes(trimmed)),
    ) ?? null
  );
}

export function shouldClearCustomerMapSelection(
  selectedGroupKey: string | null,
  groups: CustomerMapMarkerGroup[],
): boolean {
  if (!selectedGroupKey) {
    return false;
  }
  return !groups.some((group) => group.groupKey === selectedGroupKey);
}
