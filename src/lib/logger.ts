import pino from "pino";

const REDACT_PATHS = [
  "accessToken",
  "access_token",
  "*.accessToken",
  "*.access_token",
  "accessTokenEncrypted",
  "*.accessTokenEncrypted",
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "req.headers.authorization",
  "*.META_APP_SECRET",
  "*.TOKEN_ENCRYPTION_KEY",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
});
