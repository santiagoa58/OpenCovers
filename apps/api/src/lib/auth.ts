import { createCimdClientDiscovery } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { oauthProvider, type OAuthOptions } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { betterAuthSchema } from "../db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { db } from "../db/client";
import {
  INVITATION_TOKEN_HEADER,
  claimForSignup,
  grantClaimedInvitation,
} from "./invitations";
import {
  ACCESS_TOKEN_TTL_S,
  AUTHORIZATION_CODE_TTL_S,
  DEV_AUTH_SECRET,
  MCP_SCOPES,
  OFFLINE_ACCESS,
  REFRESH_TOKEN_TTL_S,
  mcpRemoteEnabled,
  mcpResourceUri,
} from "./mcp-remote";
import { decideSignup, isCreator, signupMode } from "./signup";

function invitationToken(
  context: { headers?: Headers; request?: Request } | null,
): string | null {
  const value = (context?.headers ?? context?.request?.headers)?.get(INVITATION_TOKEN_HEADER);
  return value ? value : null;
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const mcpRemote = mcpRemoteEnabled();

// ADR-0014: only the instance owner registers clients, and grants live in our own tables.
// These plugin routes would let any signed-in person manage clients or consents.
const OAUTH_CLOSED_PATHS = [
  "/oauth2/register",
  "/oauth2/create-client",
  "/oauth2/get-client",
  "/oauth2/get-clients",
  "/oauth2/update-client",
  "/oauth2/client/rotate-secret",
  "/oauth2/delete-client",
  "/oauth2/get-consent",
  "/oauth2/get-consents",
  "/oauth2/update-consent",
  "/oauth2/delete-consent",
];

const LOGIN_PAGE = "/";

export function oauthProviderOptions(resource: string) {
  return {
    // offline_access only asks for a refresh token. The metadata lists the two scopes that reach the API.
    scopes: [...MCP_SCOPES, OFFLINE_ACCESS] as string[],
    advertisedMetadata: { scopes_supported: [...MCP_SCOPES] },
    grantTypes: ["authorization_code", "refresh_token"],
    // Opaque access tokens, so every call reads the token row and revocation is immediate.
    disableJwtPlugin: true,
    storeTokens: "hashed",
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_S,
    refreshTokenExpiresIn: REFRESH_TOKEN_TTL_S,
    refreshTokenReuseInterval: 0,
    codeExpiresIn: AUTHORIZATION_CODE_TTL_S,
    allowDynamicClientRegistration: false,
    // Only the instance owner (the first-user mark) creates a client. Nobody reads, changes or deletes one this way.
    clientPrivileges: async ({ action, user }) => action === "create" && user !== undefined && isCreator(db, user.id),
    resources: [{ identifier: resource, name: "OpenCovers MCP", accessTokenTtl: ACCESS_TOKEN_TTL_S }],
    clientRegistrationDefaultResources: [resource],
    loginPage: LOGIN_PAGE,
    consentPage: "/oauth/consent",
  } satisfies OAuthOptions<string[]>;
}

/** The metadata document transport: HTTPS only, every DNS answer public, the socket pinned to the checked address. */
export const metadataFetcher: typeof fetchClientMetadataResource = fetchClientMetadataResource;

/**
 * Client ID Metadata Documents (ADR-0014), with one rule on top of the plugin: a document becomes a client row only
 * for a signed-in person. A request without a session never fetches a new document, so it neither writes rows nor
 * spends the plugin's fetch budget. On the authorization page it is sent to sign in first, and the page sends the
 * person back to the same authorization URL afterwards.
 */
function signedInMetadataDocuments(fetcher: typeof fetchClientMetadataResource) {
  const discovery = createCimdClientDiscovery({ fetchClientMetadataResource: fetcher, metadataProfile: "mcp-2026-07-28" });
  return {
    ...discovery,
    resolve: async (...[ctx, clientId, existing]: Parameters<typeof discovery.resolve>) => {
      if (existing || (await getSessionFromCtx(ctx))) return discovery.resolve(ctx, clientId, existing);
      if (ctx.path === "/oauth2/authorize") {
        throw ctx.redirect(`${LOGIN_PAGE}?${new URLSearchParams(ctx.query as Record<string, string>)}`);
      }
      return null;
    },
  };
}

function oauthPlugins(fetcher: typeof fetchClientMetadataResource) {
  return [
    oauthProvider({
      ...oauthProviderOptions(mcpResourceUri(baseURL)),
      extensions: [{ clientDiscovery: signedInMetadataDocuments(fetcher) }],
    }),
  ];
}

/** ADR-0014: PKCE and consent hold for every client. The database refuses such a row too (migration 0048). */
function refuseUnsafeClient(path: string, body: unknown) {
  if (path !== "/admin/oauth2/create-client" && path !== "/oauth2/create-client") return;
  const fields = (body ?? {}) as { skip_consent?: unknown; require_pkce?: unknown };
  if (fields.skip_consent === true || fields.require_pkce === false) {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_client_metadata",
      error_description: "Every client requires PKCE and consent.",
    });
  }
}

/** The browser origins that may sign in and send cookie-authenticated writes (lib/staff-origin.ts). */
export const trustedOrigins = [
  baseURL,
  ...(process.env.TRUSTED_ORIGINS?.split(",").filter(Boolean) ?? [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
];

export interface AuthDeps {
  /** Override the OAuth Client ID Metadata Document transport in tests. */
  fetchMetadata?: typeof fetchClientMetadataResource;
}

/** Staff authentication with invitation-aware signup and optional remote MCP authorization. */
export function createAuth(deps: AuthDeps = {}) {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET,
    baseURL,
    database: drizzleAdapter(db, { provider: "pg", schema: betterAuthSchema }),
    emailAndPassword: { enabled: true },
    // lib/rate-limit.ts limits /api/auth; avoid a second rate limiter with a different response contract.
    rateLimit: { enabled: false },
    user: {
      additionalFields: {
        firstSignup: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
          returned: false,
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (mcpRemote) refuseUnsafeClient(ctx.path, ctx.body);
      }),
    },
    plugins: mcpRemote ? oauthPlugins(deps.fetchMetadata ?? metadataFetcher) : [],
    disabledPaths: mcpRemote ? OAUTH_CLOSED_PATHS : [],
    databaseHooks: {
      user: {
        create: {
          before: async (account, context) => {
            const token = invitationToken(context);
            if (token !== null) {
              if (!(await claimForSignup(db, token, account.email))) {
                throw new APIError("FORBIDDEN", {
                  code: "INVALID_INVITATION",
                  message: "This invitation is not valid.",
                });
              }
              return { data: { firstSignup: false } };
            }
            const decision = await decideSignup(db, signupMode());
            if (!decision.allowed) {
              throw new APIError("FORBIDDEN", {
                code: "SIGNUP_CLOSED",
                message: "Sign-up is closed on this instance.",
              });
            }
            return { data: { firstSignup: decision.firstSignup } };
          },
          after: async (account, context) => {
            const token = invitationToken(context);
            if (token !== null) await grantClaimedInvitation(db, token, account.id);
          },
        },
      },
    },
    trustedOrigins,
  });
}

export const auth = createAuth();
