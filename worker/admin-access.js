import { createRemoteJWKSet, jwtVerify } from 'jose';

const keySets = new Map();

/**
 * Validates Cloudflare Access JWT header against configured team, audience and admin emails.
 * Supports comma-separated ADMIN_EMAIL list (trimmed, case-insensitive).
 */
export async function hasAdminAccess(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const team = env.ACCESS_TEAM;
  if (!token || !team || !/^[a-z0-9-]+$/.test(team) ||
      !env.ACCESS_ADMIN_AUD || !env.ADMIN_EMAIL) {
    return false;
  }

  const allowedEmails = env.ADMIN_EMAIL
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowedEmails.length === 0) return false;

  const issuer = `https://${team}.cloudflareaccess.com`;
  if (!keySets.has(issuer)) {
    keySets.set(issuer, createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer)));
  }

  try {
    const { payload } = await jwtVerify(token, keySets.get(issuer), {
      issuer,
      audience: env.ACCESS_ADMIN_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'email'],
    });
    return typeof payload.email === 'string' &&
      allowedEmails.includes(payload.email.trim().toLowerCase());
  } catch {
    return false;
  }
}
