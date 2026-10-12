import dns from 'node:dns/promises';
import net from 'node:net';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Checks whether an IPv4 address is in a private, loopback, or reserved range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [b0, b1, b2] = parts;

  // 0.0.0.0/8 (Current network / default route)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (b0 === 10) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata, e.g., 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private network)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1 / Documentation)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;

  // 192.168.0.0/16 (Private network)
  if (b0 === 192 && b1 === 168) return true;

  // 198.18.0.0/15 (Network benchmark tests)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2 / Documentation)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3 / Documentation)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // IPv6 unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv6 loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:192.168.1.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.slice(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIPv4(ipv4Part);
    }
    return true;
  }

  // IPv6 Unique Local Address (fc00::/7 -> fc.. or fd..)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // IPv6 Link-Local Unicast (fe80::/10 -> fe8.. to feb..)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates any IP address (v4 or v6). Returns true if it is private/reserved/dangerous.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateOrReservedIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateOrReservedIPv6(ip);
  }
  // Unknown format, fail closed
  return true;
}

/**
 * Hostname blacklist to prevent accessing internal infrastructure or metadata services.
 */
const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254'
]);

/**
 * Validates a parsed URL for SSRF protection:
 * 1. Checks scheme is HTTP or HTTPS only
 * 2. Checks hostname against banned names/suffixes
 * 3. Checks direct IP literals
 * 4. Performs DNS resolution and checks ALL resolved addresses against private/reserved ranges
 */
export async function validateUrlForSSRF(targetUrl: string): Promise<{
  safeUrl: URL;
  resolvedIps: string[];
}> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SecurityError(`Invalid URL format: "${targetUrl}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SecurityError(
      `Disallowed URL protocol: "${parsed.protocol}". Only "http:" and "https:" are allowed.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!hostname) {
    throw new SecurityError('URL must contain a valid hostname.');
  }

  if (
    FORBIDDEN_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.lan')
  ) {
    throw new SecurityError(`Forbidden host: "${hostname}" cannot be accessed.`);
  }

  // If hostname is directly an IP literal:
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      throw new SecurityError(`Access to private or reserved IP address "${hostname}" is blocked.`);
    }
    return { safeUrl: parsed, resolvedIps: [hostname] };
  }

  // Resolve DNS to verify all destination IPs
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new SecurityError(`DNS resolution failed for host "${hostname}": ${err.message || 'Host not found'}`);
  }

  if (!records || records.length === 0) {
    throw new SecurityError(`No IP address records found for host "${hostname}".`);
  }

  const resolvedIps = records.map(r => r.address);
  for (const ip of resolvedIps) {
    if (isPrivateOrReservedIP(ip)) {
      throw new SecurityError(
        `Host "${hostname}" resolved to private/reserved IP address "${ip}". Access blocked.`
      );
    }
  }

  return { safeUrl: parsed, resolvedIps };
}
