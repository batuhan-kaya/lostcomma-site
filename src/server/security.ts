import type { FastifyReply } from 'fastify';

/**
 * Strict policy: no inline scripts and no inline style attributes in markup.
 * Client code may still set element.style through the CSSOM (allowed by CSP).
 */
export function csp(https: boolean): string {
  const rules = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (https) rules.push('upgrade-insecure-requests');
  return rules.join('; ');
}

export function securityHeaders(reply: FastifyReply, https: boolean): void {
  const type = String(reply.getHeader('content-type') ?? '');
  if (type.startsWith('text/html')) reply.header('content-security-policy', csp(https));
  reply.header('x-content-type-options', 'nosniff');
  reply.header('referrer-policy', 'strict-origin-when-cross-origin');
  reply.header('x-frame-options', 'DENY');
  reply.header('cross-origin-opener-policy', 'same-origin');
  reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
}
