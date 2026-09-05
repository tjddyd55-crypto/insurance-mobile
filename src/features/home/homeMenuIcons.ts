import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export type HomeMenuIconName = SFSymbol | { ios: SFSymbol; android: AndroidSymbol };

const MENU_ICON_BY_ID: Partial<Record<string, HomeMenuIconName>> = {
  'ta-call': { ios: 'phone.fill', android: 'call' },
  todos: { ios: 'checklist', android: 'checklist' },
  memo: { ios: 'note.text', android: 'note' },
  notifications: { ios: 'bell.fill', android: 'notifications' },
  'customer-list': { ios: 'person.2.fill', android: 'groups' },
  'customer-map': { ios: 'map.fill', android: 'map' },
  'premium-payments': { ios: 'creditcard.fill', android: 'credit_card' },
  'customer-newsletter': { ios: 'newspaper.fill', android: 'newspaper' },
  'claim-requests': { ios: 'doc.text.fill', android: 'description' },
  'insurer-newsletters': { ios: 'newspaper.fill', android: 'newspaper' },
  'adjuster-news': { ios: 'newspaper.fill', android: 'newspaper' },
  billing: { ios: 'doc.text.fill', android: 'description' },
  profile: { ios: 'person.crop.circle.fill', android: 'person' },
  'team-members': { ios: 'person.3.fill', android: 'groups' },
  storage: { ios: 'folder.fill', android: 'folder' },
};

const DEFAULT_MENU_ICON: HomeMenuIconName = { ios: 'square.grid.2x2.fill', android: 'note' };

export function resolveHomeMenuIcon(menuId: string): HomeMenuIconName {
  return MENU_ICON_BY_ID[menuId] ?? DEFAULT_MENU_ICON;
}
