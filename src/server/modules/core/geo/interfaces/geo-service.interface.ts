/**
 * Represents a geographic coordinate
 */
export interface GeoCoordinate {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
}

/**
 * Geographic data for an IP address
 */
export interface GeoIpData {
  /** IP address */
  ip: string;
  /** Two-letter country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
  /** Country name */
  country?: string;
  /** City name */
  city?: string;
  /** Region/state name */
  region?: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** Latitude/longitude coordinates */
  location?: GeoCoordinate;
  /** Internet Service Provider */
  isp?: string;
  /** Autonomous System Number */
  asn?: number;
  /** Organization name */
  organization?: string;
  /** Timezone */
  timezone?: string;
  /** Whether the IP is a proxy/VPN */
  isProxy?: boolean;
  /** Whether the IP is a datacenter/hosting provider */
  isHosting?: boolean;
  /** Whether the IP is a tor exit node */
  isTor?: boolean;
  /** Whether the IP is from a cellular network */
  isCellular?: boolean;
}

/**
 * Result of a geolocation lookup
 */
export interface GeoLookupResult {
  /** Success flag */
  success: boolean;
  /** Result data if successful */
  data?: GeoIpData;
  /** Error message if unsuccessful */
  error?: string;
  /** Error code if unsuccessful */
  errorCode?: string;
  /** Source/provider of the data */
  source?: string;
  /** Timestamp of the lookup */
  timestamp: Date;
}

/**
 * Distance calculation options
 */
export interface DistanceOptions {
  /** Unit of measurement (meters, kilometers, miles) */
  unit?: "meters" | "kilometers" | "miles";
  /** Precision of the result (decimal places) */
  precision?: number;
}

/**
 * Distance calculation result
 */
export interface DistanceResult {
  /** Distance value */
  distance: number;
  /** Unit of measurement */
  unit: string;
}

/**
 * Geographic interface
 */
export interface IGeoService {
  /**
   * Get geolocation data for an IP address
   * @param ip IP address to lookup
   * @param options Options for the lookup
   */
  lookupIp(ip: string, options?: Record<string, any>): Promise<GeoLookupResult>;

  /**
   * Calculate the distance between two geographic coordinates
   * @param point1 First coordinate
   * @param point2 Second coordinate
   * @param options Options for the calculation
   */
  calculateDistance(
    point1: GeoCoordinate,
    point2: GeoCoordinate,
    options?: DistanceOptions
  ): DistanceResult;

  /**
   * Check if a coordinate is within a given radius of another coordinate
   * @param center Center coordinate
   * @param point Point to check
   * @param radiusKm Radius in kilometers
   */
  isWithinRadius(
    center: GeoCoordinate,
    point: GeoCoordinate,
    radiusKm: number
  ): boolean;

  /**
   * Find nearest point from a list of coordinates
   * @param point Reference point
   * @param points List of points to check
   */
  findNearestPoint(
    point: GeoCoordinate,
    points: GeoCoordinate[]
  ): { point: GeoCoordinate; distance: number } | null;

  /**
   * Validates if a coordinate is valid (within bounds)
   * @param coordinate Coordinate to validate
   */
  isValidCoordinate(coordinate: GeoCoordinate): boolean;
}
