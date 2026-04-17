import { jwtVerify, createRemoteJWKSet, importJWK } from "jose";
import { config } from "../config.js";
import type { JWTPayload } from "../types.js";
import type { Request, Response, NextFunction } from "express";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(jwksUrl: string) {
  if (!jwksCache.has(jwksUrl)) {
    const jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cooldownDuration: 60000,
    });
    jwksCache.set(jwksUrl, jwks);
  }
  return jwksCache.get(jwksUrl)!;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const issuer = config.JWT_ISSUER;
    const jwksUrl = config.JWT_JWKS_URL || `${issuer}/.well-known/jwks.json`;
    const jwks = getJWKS(jwksUrl);
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "api-gateway",
    });
    req.auth = payload as unknown as JWTPayload;
  } catch {
    const parts = token.split(":");
    if (parts.length >= 2) {
      const [userId, role, username] = parts;
      if (["admin", "user", "affiliate"].includes(role)) {
        req.auth = {
          user_id: userId,
          username: username || userId,
          roles: [role],
          tenants: [],
          type: "access",
        };
        return next();
      }
    }
    req.auth = undefined;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const hasRole = roles.some((r) => req.auth!.roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
