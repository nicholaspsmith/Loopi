/**
 * IP Geolocation Helper
 *
 * Uses ip-api.com free tier for IP geolocation
 * Features:
 * - Free tier: 45 requests/minute (sufficient for rate-limited operations)
 * - In-memory caching (24 hour TTL)
 * - Non-blocking - returns null on failure
 */

interface GeolocationData {
  country: string
  region: string
  city: string
}

interface CacheEntry {
  data: GeolocationData
  timestamp: number
}

// In-memory cache: IP -> {data, timestamp}
const cache = new Map<string, CacheEntry>()

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get geolocation data for IP address
 *
 * Uses ip-api.com with in-memory caching
 * Non-blocking - returns null on error
 *
 * @param ipAddress - IP address to geolocate
 * @returns Geolocation data or null if lookup fails
 *
 * @example
 * const geo = await getGeolocation('8.8.8.8')
 * if (geo) {
 *   console.log(`${geo.city}, ${geo.region}, ${geo.country}`)
 * }
 */
export async function getGeolocation(ipAddress: string): Promise<GeolocationData | null> {
  // Skip for local/private IPs
  if (isPrivateIP(ipAddress)) {
    return null
  }

  // Check cache
  const cached = cache.get(ipAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // Create timeout controller for compatibility with all Node versions
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    // Call ip-api.com (HTTPS for security)
    const response = await fetch(
      `https://ip-api.com/json/${ipAddress}?fields=country,regionName,city`,
      {
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`⚠️  Geolocation lookup failed for ${ipAddress}: ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (data.status === 'fail') {
      console.warn(`⚠️  Geolocation lookup failed for ${ipAddress}: ${data.message}`)
      return null
    }

    const geoData: GeolocationData = {
      country: data.country || 'Unknown',
      region: data.regionName || 'Unknown',
      city: data.city || 'Unknown',
    }

    // Cache result
    cache.set(ipAddress, {
      data: geoData,
      timestamp: Date.now(),
    })

    return geoData
  } catch (error) {
    clearTimeout(timeoutId)
    // Non-blocking - log error but return null
    console.warn(`⚠️  Geolocation lookup error for ${ipAddress}:`, error)
    return null
  }
}

/**
 * Check if IP address is private/local
 *
 * @param ip - IP address to check
 * @returns True if IP is private/local
 */
function isPrivateIP(ip: string): boolean {
  // Local/private IP patterns
  const privatePatterns = [
    /^127\./, // Loopback
    /^10\./, // Private class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B
    /^192\.168\./, // Private class C
    /^::1$/, // IPv6 loopback
    /^fe80:/, // IPv6 link-local
    /^localhost$/i, // Localhost hostname
  ]

  return privatePatterns.some((pattern) => pattern.test(ip))
}

/**
 * Clear geolocation cache
 *
 * Useful for testing or manual cache invalidation
 */
export function clearGeolocationCache(): void {
  cache.clear()
}
