import {
  isDevClientRuntime,
  normalizePlayStatus,
  resolvePlayUpdateFlow,
  shouldOfferPlayUpdate,
} from '../policy';

const production = {
  platform: 'android',
  isDev: false,
  isDevClient: false,
  isProductionApp: true,
};

test('store flow defaults to flexible and keeps immediate as a separate choice', () => {
  expect(resolvePlayUpdateFlow()).toBe('flexible');
});

test.each([
  { ...production, platform: 'ios' },
  { ...production, isDev: true },
  { ...production, isDevClient: true },
  { ...production, isProductionApp: false },
])('does not offer Play in-app updates for %j', (input) => {
  expect(shouldOfferPlayUpdate(input)).toBe(false);
});

test('offers Play in-app updates only for an Android production release', () => {
  expect(shouldOfferPlayUpdate(production)).toBe(true);
});

test('treats Expo Go and the dev client as a dev client runtime', () => {
  expect(isDevClientRuntime({
    executionEnvironment: 'storeClient',
    channel: 'native-production',
  })).toBe(true);
  expect(isDevClientRuntime({
    executionEnvironment: 'standalone',
    channel: 'native-development',
  })).toBe(true);
  expect(isDevClientRuntime({
    executionEnvironment: 'standalone',
    channel: 'native-production',
  })).toBe(false);
  expect(isDevClientRuntime({
    executionEnvironment: 'standalone',
    channel: 'native-preview',
  })).toBe(false);
});

test.each([
  ['not_from_play', 'no_update'],
  ['type_not_allowed', 'no_update'],
  ['no_update', 'no_update'],
  ['available', 'available'],
  ['downloaded', 'downloaded'],
  ['in_progress', 'in_progress'],
  ['failed', 'failed'],
  [null, 'failed'],
])('normalizes Play status %s to %s', (status, expected) => {
  expect(normalizePlayStatus(status)).toBe(expected);
});
