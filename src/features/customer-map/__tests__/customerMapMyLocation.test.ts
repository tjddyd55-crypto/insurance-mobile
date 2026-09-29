import * as Location from 'expo-location';

import { requestMyLocation } from '../customerMapMyLocation';

jest.mock('expo-location', () => ({
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

describe('customerMapMyLocation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns unavailable when location services are disabled', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);
    await expect(requestMyLocation()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('returns denied when foreground permission is not granted', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    await expect(requestMyLocation()).resolves.toEqual({ ok: false, reason: 'denied' });
  });

  it('returns current coordinates when permission is granted', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 37.1, longitude: 127.2 },
    });
    await expect(requestMyLocation()).resolves.toEqual({
      ok: true,
      latitude: 37.1,
      longitude: 127.2,
    });
  });

  it('returns unavailable when coordinates are invalid', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: Number.NaN, longitude: 127.2 },
    });
    await expect(requestMyLocation()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});
