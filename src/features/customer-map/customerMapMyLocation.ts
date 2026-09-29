import * as Location from 'expo-location';

export type MyLocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' };

export async function requestMyLocation(): Promise<MyLocationResult> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return { ok: false, reason: 'unavailable' };
  }

  const current = await Location.getForegroundPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    const requested = await Location.requestForegroundPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return { ok: false, reason: 'denied' };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: 'unavailable' };
  }

  return { ok: true, latitude, longitude };
}
