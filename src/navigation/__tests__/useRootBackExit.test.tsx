import { renderHook } from '@testing-library/react-native';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

import { useRootBackExit } from '../useRootBackExit';

const mockNav = { canGoBack: jest.fn(() => false) };
jest.mock('expo-router', () => ({
  useNavigation: () => mockNav,
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(effect, [effect]);
  },
}));

describe('useRootBackExit', () => {
  let listeners: (() => boolean)[];
  beforeEach(() => {
    listeners = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, fn) => {
      listeners.push(fn as () => boolean);
      return { remove: jest.fn() };
    });
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => undefined);
    mockNav.canGoBack.mockReturnValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('android root: toast first, exit on second', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    renderHook(() => useRootBackExit());
    expect(listeners[0]()).toBe(true);
    expect(ToastAndroid.show).toHaveBeenCalledWith('한 번 더 누르면 종료됩니다', ToastAndroid.SHORT);
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
    expect(listeners[0]()).toBe(true);
    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  });

  it('history exists (non-root): yields to navigation, no toast/exit', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockNav.canGoBack.mockReturnValue(true);
    renderHook(() => useRootBackExit());
    expect(listeners[0]()).toBe(false);
    expect(ToastAndroid.show).not.toHaveBeenCalled();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it('a later-registered modal/drawer handler would run first (LIFO): hook registers exactly one listener', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    renderHook(() => useRootBackExit());
    expect(listeners).toHaveLength(1);
  });

  it('iOS: no listener', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    renderHook(() => useRootBackExit());
    expect(listeners).toHaveLength(0);
  });
});
