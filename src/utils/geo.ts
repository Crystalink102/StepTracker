/**
 * Haversine distance between two GPS coords in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance from an array of coordinates.
 */
export function totalDistance(
  coords: { latitude: number; longitude: number }[]
): number {
  let distance = 0;
  for (let i = 1; i < coords.length; i++) {
    distance += haversineDistance(
      coords[i - 1].latitude,
      coords[i - 1].longitude,
      coords[i].latitude,
      coords[i].longitude
    );
  }
  return distance;
}

/**
 * Calculate speed in km/h from distance (meters) and time (seconds).
 */
export function speedKmh(distanceMeters: number, seconds: number): number {
  if (seconds === 0) return 0;
  return (distanceMeters / 1000) / (seconds / 3600);
}

/**
 * Calculate pace in seconds per km.
 */
export function paceSecondsPerKm(distanceMeters: number, seconds: number): number {
  if (distanceMeters === 0) return 0;
  return (seconds / distanceMeters) * 1000;
}

/**
 * Encode coordinates as a polyline string (Google Encoded Polyline Algorithm).
 */
export function encodePolyline(
  coords: { latitude: number; longitude: number }[]
): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const { latitude, longitude } of coords) {
    const lat = Math.round(latitude * 1e5);
    const lng = Math.round(longitude * 1e5);

    encoded += encodeValue(lat - prevLat);
    encoded += encodeValue(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

/**
 * Decode a polyline string back to coordinates.
 */
export function decodePolyline(
  encoded: string
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;

  while (i < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}
