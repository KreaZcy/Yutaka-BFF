export interface JWTPayload {
  user_id: string;
  username: string;
  roles: string[];
  tenants: string[];
  type: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
    }
  }
}
