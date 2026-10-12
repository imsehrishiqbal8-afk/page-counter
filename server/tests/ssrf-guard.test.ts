import { describe, it, expect } from 'vitest';
import {
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  isPrivateOrReservedIP,
  validateUrlForSSRF,
  SecurityError
} from '../src/security/ssrf-guard.js';

describe('SSRF Guard & IP Protection', () => {
  describe('IPv4 validation', () => {
    it('blocks loopback addresses', () => {
      expect(isPrivateOrReservedIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIPv4('127.1.2.3')).toBe(true);
    });

    it('blocks private network ranges (10.x, 172.16-31.x, 192.168.x)', () => {
      expect(isPrivateOrReservedIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIPv4('10.255.255.254')).toBe(true);
      expect(isPrivateOrReservedIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIPv4('192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIPv4('192.168.0.254')).toBe(true);
    });

    it('blocks link-local and cloud metadata addresses (169.254.x.x)', () => {
      expect(isPrivateOrReservedIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIPv4('169.254.1.1')).toBe(true);
    });

    it('blocks 0.0.0.0 and broadcast/multicast ranges', () => {
      expect(isPrivateOrReservedIPv4('0.0.0.0')).toBe(true);
      expect(isPrivateOrReservedIPv4('224.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIPv4('255.255.255.255')).toBe(true);
    });

    it('allows valid public routable IPv4 addresses', () => {
      expect(isPrivateOrReservedIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIPv4('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIPv4('93.184.216.34')).toBe(false);
    });
  });

  describe('IPv6 validation', () => {
    it('blocks loopback and unspecified IPv6 addresses', () => {
      expect(isPrivateOrReservedIPv6('::1')).toBe(true);
      expect(isPrivateOrReservedIPv6('::')).toBe(true);
    });

    it('blocks unique-local and link-local IPv6 addresses', () => {
      expect(isPrivateOrReservedIPv6('fe80::1')).toBe(true);
      expect(isPrivateOrReservedIPv6('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIPv6('fd12:3456:789a::1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 loopback and private addresses', () => {
      expect(isPrivateOrReservedIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIPv6('::ffff:192.168.1.1')).toBe(true);
    });
  });

  describe('validateUrlForSSRF', () => {
    it('rejects disallowed protocols', async () => {
      await expect(validateUrlForSSRF('ftp://example.com')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('gopher://example.com')).rejects.toThrow(SecurityError);
    });

    it('rejects localhost and dangerous hostnames', async () => {
      await expect(validateUrlForSSRF('http://localhost:3000')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://sub.localhost/')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://metadata.google.internal')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://server.local')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://test.internal')).rejects.toThrow(SecurityError);
    });

    it('rejects direct private IP URLs', async () => {
      await expect(validateUrlForSSRF('http://127.0.0.1/admin')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://192.168.1.1/')).rejects.toThrow(SecurityError);
      await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data')).rejects.toThrow(SecurityError);
    });
  });
});
