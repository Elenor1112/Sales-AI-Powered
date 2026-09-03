import crypto from "node:crypto";
import { graphFetch } from "./client";
import { META_REQUIRED_SCOPES } from "./permissions";
import type { MetaOAuthTokenResponse } from "./types";

const OAUTH_DIALOG_URL = "https://www.facebook.com/v20.0/dialog/oauth";
const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  organizationId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
}

function getStateSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

/**
 * Builds a signed, time-limited OAuth state token to protect the Meta OAuth
 * callback against CSRF. The payload is base64url JSON + an HMAC signature,
 * verified in parseAndVerifyState before any token exchange happens.
 */
export function createOAuthState(organizationId: string, userId: string): string {
  const payload: OAuthStatePayload = {
    organizationId,
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function parseAndVerifyState(state: string): OAuthStatePayload {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) {
    throw new Error("Malformed OAuth state");
  }
  const expectedSignature = sign(payloadB64);
  const validSignature =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!validSignature) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OAuthStatePayload;
  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    throw new Error("OAuth state has expired");
  }
  return payload;
}

export function buildAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) {
    throw new Error("META_APP_ID and META_REDIRECT_URI must be configured");
  }

  const url = new URL(OAUTH_DIALOG_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  // TEMP: testing with required scopes only to isolate the "Invalid Scopes"
  // error — ads_management/ads_read need the Marketing API use case added
  // in the Meta dashboard before they can be requested. Revert to
  // getAllRequestedScopes() once that's set up.
  url.searchParams.set("scope", META_REQUIRED_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<MetaOAuthTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI must be configured");
  }

  return graphFetch<MetaOAuthTokenResponse>("oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<MetaOAuthTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET must be configured");
  }

  return graphFetch<MetaOAuthTokenResponse>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}
