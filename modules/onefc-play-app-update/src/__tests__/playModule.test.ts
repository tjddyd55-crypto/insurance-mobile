import { beginPlayUpdate, readPlayUpdate, subscribePlayInstallStatus } from '../index';

test('iOS never calls the Play module', async () => {
  await expect(readPlayUpdate('flexible', 'ios')).resolves.toMatchObject({
    status: 'not_from_play',
    installedFromPlay: false,
  });
  await expect(beginPlayUpdate('immediate', 'ios')).resolves.toBe('not_from_play');
  expect(subscribePlayInstallStatus(() => undefined, 'ios')()).toBeUndefined();
});

test('Android without the native module fails open', async () => {
  await expect(readPlayUpdate('flexible', 'android')).resolves.toMatchObject({ status: 'failed' });
  await expect(beginPlayUpdate('flexible', 'android')).resolves.toBe('failed');
  const stop = subscribePlayInstallStatus(() => undefined, 'android');
  expect(typeof stop).toBe('function');
  stop();
});
