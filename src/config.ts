export interface EnvConfig {
  REKOGNIZCY_URL: string;
  AFILIAZCY_URL: string;
  PROMO_SERVICE_URL: string;
  ORDER_SERVICE_URL: string;
  PORT: number;
  JWT_ISSUER: string;
  JWT_JWKS_URL: string;
}

export function loadConfig(): EnvConfig {
  return {
    REKOGNIZCY_URL: process.env.REKOGNIZCY_URL || "http://localhost:6969",
    AFILIAZCY_URL: process.env.AFILIAZCY_URL || "http://localhost:8081",
    PROMO_SERVICE_URL: process.env.PROMO_SERVICE_URL || "http://localhost:9998",
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || "http://localhost:2471",
    PORT: parseInt(process.env.PORT || "3100", 10),
    JWT_ISSUER: process.env.JWT_ISSUER || "http://localhost:6969",
    JWT_JWKS_URL: process.env.JWT_JWKS_URL || "",
  };
}

export const config = loadConfig();
