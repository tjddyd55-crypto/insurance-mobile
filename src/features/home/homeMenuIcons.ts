import type { SFSymbol } from 'expo-symbols';

const MENU_ICON_BY_ID: Partial<Record<string, SFSymbol>> = {
  'ta-call': 'phone.fill',
  todos: 'checklist',
  memos: 'note.text',
  notifications: 'bell.fill',
  customers: 'person.2.fill',
  'customer-map': 'map.fill',
  'premium-payments': 'creditcard.fill',
  newsletters: 'newspaper.fill',
  billing: 'doc.text.fill',
  profile: 'person.crop.circle.fill',
  team: 'person.3.fill',
  storage: 'folder.fill',
};

export function resolveHomeMenuIcon(menuId: string): SFSymbol {
  return MENU_ICON_BY_ID[menuId] ?? 'square.grid.2x2.fill';
}
