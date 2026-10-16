/**
 * Utility functions for geographical calculations and coordinates
 */

/**
 * Calculates great-circle distance between two points using the Haversine formula
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null;
  }

  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // rounded to 2 decimals
}

/**
 * Formats a distance in kilometers into a human-readable string
 * @param {number} km Distance in kilometers
 * @returns {string} Formatted string, e.g. "850 m" or "4.2 km"
 */
export function formatDistance(km) {
  if (km === null || km === undefined || isNaN(km)) return "";
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km.toFixed(1)} km away`;
}

/**
 * Validates if latitude and longitude are within normal earthly boundaries
 */
export function isValidCoordinate(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

/**
 * Popular location presets for testing and quick admin selection
 */
export const POPULAR_LOCATIONS = [
  {
    name: "Sector 70, Mohali",
    lat: 30.710210638829736,
    lng: 76.69360137728076,
  },
  {
    name: "Phase 7, Mohali",
    lat: 30.7135,
    lng: 76.7095,
  },
  {
    name: "Sector 17, Chandigarh",
    lat: 30.7415,
    lng: 76.782,
  },
  {
    name: "Connaught Place, New Delhi",
    lat: 28.6315,
    lng: 77.2195,
  },
  {
    name: "Cyber City, Gurugram",
    lat: 28.4900,
    lng: 77.0900,
  },
  {
    name: "Bandra West, Mumbai",
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    name: "Koramangala, Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    name: "Hitec City, Hyderabad",
    lat: 17.4435,
    lng: 78.3772,
  },
  {
    name: "Times Square, New York",
    lat: 40.7580,
    lng: -73.9855,
  },
  {
    name: "Oxford Street, London",
    lat: 51.5154,
    lng: -0.1419,
  },
];

/**
 * Validates GeoJSON Polygon coordinates structure.
 * A GeoJSON polygon requires:
 * 1. An array of coordinate rings: [[[lng, lat], [lng, lat], ...]]
 * 2. At least 4 points (3 vertices + 1 closing point)
 * 3. The first coordinate MUST match the last coordinate (closed ring)
 * 4. Latitudes between -90 and 90, Longitudes between -180 and 180.
 */
export function validateGeoJSONPolygon(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { valid: false, message: "Polygon must contain at least one ring of coordinates." };
  }

  const ring = coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return {
      valid: false,
      message: "A polygon requires at least 3 distinct corners (minimum 4 points including closure).",
    };
  }

  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i];
    if (!Array.isArray(pt) || pt.length < 2) {
      return { valid: false, message: `Coordinate at position ${i} is not a valid [lng, lat] pair.` };
    }
    const [lng, lat] = pt;
    if (!isValidCoordinate(lat, lng)) {
      return {
        valid: false,
        message: `Invalid coordinate at position ${i}: [${lng}, ${lat}]. Latitude must be -90..90 and Longitude -180..180.`,
      };
    }
  }

  // Check closure: first coordinate must match the last coordinate
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed =
    Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7;

  if (!isClosed) {
    return {
      valid: false,
      message: "The polygon ring must be closed (first coordinate and last coordinate must be identical).",
    };
  }

  return { valid: true };
}

/**
 * Standard Ray-Casting algorithm: tests whether a [longitude, latitude] point is inside a polygon ring.
 * Useful for fast client-side checks and as an in-memory fallback.
 * @param {[number, number]} point [lng, lat]
 * @param {Array<[number, number]>} ring Array of [lng, lat] vertices
 * @returns {boolean} True if point is inside polygon
 */
export function isPointInPolygon(point, ring) {
  if (!point || !Array.isArray(ring) || ring.length < 3) return false;
  const [x, y] = point; // x is longitude, y is latitude
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates centroid of a polygon ring for map centering and markers
 * @param {Array<[number, number]>} ring Array of [lng, lat]
 * @returns {{ lat: number, lng: number }}
 */
export function calculatePolygonCenter(ring) {
  if (!ring || ring.length === 0) return { lat: 30.7102, lng: 76.6936 };
  let totalLng = 0;
  let totalLat = 0;
  const count = ring.length;
  for (const pt of ring) {
    totalLng += pt[0];
    totalLat += pt[1];
  }
  return {
    lat: totalLat / count,
    lng: totalLng / count,
  };
}

/**
 * Resolves overlapping delivery zones deterministically.
 * Rules:
 * 1. Highest Priority (e.g. Priority 10 beats Priority 1)
 * 2. Lowest Delivery Charge (best value for customer)
 * 3. Most recently updated
 */
export function pickBestDeliveryZone(zones = []) {
  if (!zones || zones.length === 0) return null;
  if (zones.length === 1) return zones[0];

  const sorted = [...zones].sort((a, b) => {
    // 1. Priority descending
    const prioA = Number(a.priority) || 0;
    const prioB = Number(b.priority) || 0;
    if (prioB !== prioA) return prioB - prioA;

    // 2. Lowest delivery charge
    const feeA = Number(a.deliveryCharge) || 0;
    const feeB = Number(b.deliveryCharge) || 0;
    if (feeA !== feeB) return feeA - feeB;

    // 3. Newest creation
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return sorted[0];
}

