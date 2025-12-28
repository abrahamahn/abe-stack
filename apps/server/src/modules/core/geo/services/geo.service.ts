import { IDatabaseServer } from "@/server/infrastructure/database";
import { ILoggerService } from "@/server/infrastructure/logging";
import { BaseService } from "@/server/modules/base";

import {
  GeoCoordinate,
  GeoIpData,
  GeoLookupResult,
  DistanceOptions,
  DistanceResult,
  IGeoService,
} from "./IGeoService";

/**
 * Earth radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Service for geographic operations
 */
export class GeoService extends BaseService implements IGeoService {
  private ipstackApiKey: string;
  private ipgeolocationApiKey: string;
  private ipifyApiKey: string;
  private maxmindApiKey: string;
  private cacheTtlMs: number = 24 * 60 * 60 * 1000; // 24 hours

  // Simple in-memory cache
  private cache: Map<string, { data: GeoIpData; timestamp: number }> =
    new Map();

  constructor(
    logger: ILoggerService,
    databaseService: IDatabaseServer,
    config: {
      ipstackApiKey?: string;
      ipgeolocationApiKey?: string;
      ipifyApiKey?: string;
      maxmindApiKey?: string;
      cacheTtlMs?: number;
    } = {}
  ) {
    super(logger, databaseService);
    this.ipstackApiKey = config.ipstackApiKey || "";
    this.ipgeolocationApiKey = config.ipgeolocationApiKey || "";
    this.ipifyApiKey = config.ipifyApiKey || "";
    this.maxmindApiKey = config.maxmindApiKey || "";
    if (config.cacheTtlMs) {
      this.cacheTtlMs = config.cacheTtlMs;
    }
  }

  /**
   * Get geolocation data for an IP address
   */
  async lookupIp(
    ip: string,
    options: Record<string, any> = {}
  ): Promise<GeoLookupResult> {
    try {
      // Check cache first
      const cacheKey = `ip:${ip}`;
      const cachedData = this.cache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < this.cacheTtlMs) {
        this.logger.debug("Using cached geo data for IP", { ip });
        return {
          success: true,
          data: cachedData.data,
          source: "cache",
          timestamp: new Date(),
        };
      }

      // If not in cache, fetch from API
      const provider = options.provider || "ipstack";
      let data: GeoIpData;

      switch (provider) {
        case "ipstack":
          data = await this.lookupWithIpstack(ip);
          break;
        case "ipgeolocation":
          data = await this.lookupWithIpgeolocation(ip);
          break;
        case "maxmind":
          data = await this.lookupWithMaxmind(ip);
          break;
        default:
          data = await this.lookupWithIpstack(ip);
      }

      // Store in cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return {
        success: true,
        data,
        source: provider,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Error looking up IP", {
        ip,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: "Failed to lookup IP",
        errorCode: "GEO_LOOKUP_FAILED",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Calculate the distance between two geographic coordinates
   * Uses the Haversine formula for calculating great-circle distance
   */
  calculateDistance(
    point1: GeoCoordinate,
    point2: GeoCoordinate,
    options: DistanceOptions = {}
  ): DistanceResult {
    // Convert to radians
    const lat1 = this.toRadians(point1.latitude);
    const lon1 = this.toRadians(point1.longitude);
    const lat2 = this.toRadians(point2.latitude);
    const lon2 = this.toRadians(point2.longitude);

    // Haversine formula
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in kilometers
    let distance = EARTH_RADIUS_KM * c;
    let unit = "kilometers";

    // Convert to requested unit
    if (options.unit === "miles") {
      distance = distance * 0.621371;
      unit = "miles";
    } else if (options.unit === "meters") {
      distance = distance * 1000;
      unit = "meters";
    }

    // Apply precision if specified
    if (options.precision !== undefined) {
      distance = Number(distance.toFixed(options.precision));
    }

    return { distance, unit };
  }

  /**
   * Check if a coordinate is within a given radius of another coordinate
   */
  isWithinRadius(
    center: GeoCoordinate,
    point: GeoCoordinate,
    radiusKm: number
  ): boolean {
    const { distance } = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }

  /**
   * Find nearest point from a list of coordinates
   */
  findNearestPoint(
    point: GeoCoordinate,
    points: GeoCoordinate[]
  ): { point: GeoCoordinate; distance: number } | null {
    if (!points.length) {
      return null;
    }

    let nearestPoint = points[0];
    let minDistance = this.calculateDistance(point, nearestPoint).distance;

    for (let i = 1; i < points.length; i++) {
      const currentPoint = points[i];
      const distance = this.calculateDistance(point, currentPoint).distance;

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = currentPoint;
      }
    }

    return { point: nearestPoint, distance: minDistance };
  }

  /**
   * Validates if a coordinate is valid
   */
  isValidCoordinate(coordinate: GeoCoordinate): boolean {
    return (
      coordinate.latitude >= -90 &&
      coordinate.latitude <= 90 &&
      coordinate.longitude >= -180 &&
      coordinate.longitude <= 180
    );
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Lookup IP using IPStack API
   */
  private async lookupWithIpstack(ip: string): Promise<GeoIpData> {
    if (!this.ipstackApiKey) {
      throw new Error("IPStack API key not configured");
    }

    const url = `http://api.ipstack.com/${ip}?access_key=${this.ipstackApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      ip: data.ip,
      countryCode: data.country_code,
      country: data.country_name,
      city: data.city,
      region: data.region_name,
      postalCode: data.zip,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      isp: data.connection?.isp,
      organization: data.connection?.org,
      timezone: data.time_zone?.id,
      isProxy: data.security?.is_proxy === 1,
    };
  }

  /**
   * Lookup IP using IPGeolocation API
   */
  private async lookupWithIpgeolocation(ip: string): Promise<GeoIpData> {
    if (!this.ipgeolocationApiKey) {
      throw new Error("IPGeolocation API key not configured");
    }

    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${this.ipgeolocationApiKey}&ip=${ip}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      ip: data.ip,
      countryCode: data.country_code2,
      country: data.country_name,
      city: data.city,
      region: data.state_prov,
      postalCode: data.zipcode,
      location: {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      },
      isp: data.isp,
      organization: data.organization,
      timezone: data.time_zone?.name,
    };
  }

  /**
   * Lookup IP using MaxMind API
   */
  private async lookupWithMaxmind(ip: string): Promise<GeoIpData> {
    if (!this.maxmindApiKey) {
      throw new Error("MaxMind API key not configured");
    }

    // Note: This is a placeholder implementation as MaxMind requires more complex setup
    // with account ID and license key in a specific format
    const url = `https://geoip.maxmind.com/geoip/v2.1/city/${ip}`;
    const auth = Buffer.from(`${this.maxmindApiKey}`).toString("base64");

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    const data = await response.json();

    return {
      ip: data.traits.ip_address,
      countryCode: data.country.iso_code,
      country: data.country.names.en,
      city: data.city?.names.en,
      region: data.subdivisions?.[0]?.names.en,
      postalCode: data.postal?.code,
      location: {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      },
      isp: data.traits.isp,
      asn: data.traits.autonomous_system_number,
      organization: data.traits.organization,
      timezone: data.location.time_zone,
      isProxy: data.traits.is_anonymous_proxy,
      isTor: data.traits.is_tor_exit_node,
    };
  }
}
