# OAuth Provider Setup Guide

This guide explains how to configure OAuth providers (Google, GitHub, Apple) for social login in ABE Stack.

## Overview

ABE Stack supports OAuth 2.0 authentication with:

- **Google** - Email/profile via OpenID Connect
- **GitHub** - Email via user API
- **Apple** - Sign in with Apple (requires additional configuration)

Providers are automatically enabled when their environment variables are configured.

## Environment Variables

Add these to your `.env` file. Providers without `CLIENT_ID` are disabled.

### Google OAuth

```bash
# Required
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional - defaults to /api/auth/oauth/google/callback
GOOGLE_CALLBACK_URL=/api/auth/oauth/google/callback
```

### GitHub OAuth

```bash
# Required
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional - defaults to /api/auth/oauth/github/callback
GITHUB_CALLBACK_URL=/api/auth/oauth/github/callback
```

### Apple OAuth

Apple requires additional configuration:

```bash
# Required
APPLE_CLIENT_ID=your-apple-service-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id

# Private key - either raw value or base64 encoded
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# OR
APPLE_PRIVATE_KEY_BASE64=base64-encoded-private-key

# Optional - defaults to /api/auth/oauth/apple/callback
APPLE_CALLBACK_URL=/api/auth/oauth/apple/callback
```

## Callback URL Configuration

**This is the most common source of OAuth errors.**

### Callback URL Format

Your OAuth callback URL must be registered with each provider. The format is:

```
https://your-domain.com/api/auth/oauth/{provider}/callback
```

Examples:

- `https://myapp.com/api/auth/oauth/google/callback`
- `https://myapp.com/api/auth/oauth/github/callback`
- `https://myapp.com/api/auth/oauth/apple/callback`

### Development Callback URL

For local development:

```
http://localhost:3000/api/auth/oauth/{provider}/callback
```

**Important:** Most providers require HTTPS for production. Google and GitHub allow `http://localhost` for development, but Apple requires HTTPS even for development (use a tunnel like ngrok).

### APP_BASE_URL Setting

Set `APP_BASE_URL` in your server environment:

```bash
# Development
APP_BASE_URL=http://localhost:3000

# Production
APP_BASE_URL=https://your-production-domain.com
```

The callback URL is constructed as: `{APP_BASE_URL}{PROVIDER_CALLBACK_URL}`

## Provider-Specific Setup

### Google Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/oauth/google/callback`
   - Production: `https://yourdomain.com/api/auth/oauth/google/callback`
7. Copy Client ID and Client Secret

**Common pitfalls:**

- Forgetting to add the redirect URI
- Mismatch between registered URI and actual callback (trailing slashes matter!)
- Not enabling the Google+ API (required for profile info)

### GitHub Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: Your app name
   - Homepage URL: Your app URL
   - Authorization callback URL: `https://yourdomain.com/api/auth/oauth/github/callback`
4. Copy Client ID and generate Client Secret

**Common pitfalls:**

- GitHub OAuth apps are per-user/organization
- Callback URL must match exactly (no trailing slash)
- User email must be public OR you need `user:email` scope (we request this automatically)

### Apple Setup

Apple Sign In requires an Apple Developer account ($99/year).

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, IDs & Profiles**
3. Create an **App ID**:
   - Enable "Sign in with Apple"
   - Configure as primary or grouped
4. Create a **Services ID**:
   - This is your `APPLE_CLIENT_ID`
   - Configure domains and redirect URLs
   - Domain: `yourdomain.com`
   - Return URL: `https://yourdomain.com/api/auth/oauth/apple/callback`
5. Create a **Key**:
   - Enable "Sign in with Apple"
   - Download the `.p8` file (only downloadable once!)
   - Key ID is your `APPLE_KEY_ID`

**Common pitfalls:**

- Private key can only be downloaded once - store it securely
- Services ID (not App ID) is the client ID
- Must use HTTPS even for development
- Team ID is the 10-character ID in the top right of developer portal
- Private key must be in PEM format with proper line breaks

**Base64 encoding the private key:**

```bash
# Convert the .p8 file to base64 (avoids multiline issues in .env)
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n'
```

## Troubleshooting

### "Invalid redirect_uri"

The callback URL registered with the provider doesn't match what your app is sending.

**Check:**

1. Exact URL match (including trailing slashes)
2. Protocol match (http vs https)
3. Port number (localhost:3000 vs localhost)
4. `APP_BASE_URL` is set correctly

### "State mismatch" or "Invalid state"

The CSRF protection state parameter was lost or tampered with.

**Causes:**

- User took too long (state expires after 10 minutes)
- Multiple browser tabs interfering
- Cookie issues (SameSite, Secure flags)

### "Email not verified" errors

Some providers don't verify emails. ABE Stack inherits the verification status from the provider:

- Google: Always verified
- GitHub: Check if email is verified via API
- Apple: Always verified

### Apple-specific issues

**"Invalid client_secret"**

- Private key format is wrong (must be PEM)
- Key ID doesn't match the key
- Team ID is incorrect

**"invalid_request"**

- Services ID not properly configured
- Return URL not registered

## Security Considerations

1. **Never commit** OAuth secrets to version control
2. **Use HTTPS** in production for all callback URLs
3. **Rotate secrets** periodically
4. **Monitor** OAuth login events in security logs
5. **Limit scopes** to only what you need

## OAuth Flow

```
1. User clicks "Sign in with Google/GitHub/Apple"
2. Browser redirects to provider's authorization page
3. User approves access
4. Provider redirects to callback URL with authorization code
5. Server exchanges code for access token
6. Server fetches user info from provider
7. Server creates/updates user account
8. User is logged in with JWT
```

## Frontend Integration

OAuth buttons are automatically shown on login/register pages when providers are enabled.

### Checking Enabled Providers

```typescript
// SDK hook
const { providers, isLoading } = useEnabledOAuthProviders(config);
// providers: ['google', 'github', 'apple']
```

### Managing Connected Accounts

```typescript
// SDK hook for authenticated users
const { connections, unlink, getLinkUrl } = useOAuthConnections(config);

// Connect new provider
window.location.href = getLinkUrl('google');

// Disconnect provider
await unlink('google');
```

## Related Files

- Server OAuth routes: `apps/server/src/modules/auth/oauth/`
- Server OAuth providers: `apps/server/src/modules/auth/oauth/providers/`
- Auth config: `apps/server/src/config/auth.config.ts`
- SDK OAuth hooks: `client/src/oauth/`
- Frontend OAuth buttons: `apps/web/src/features/auth/components/OAuthButtons.tsx`
- Connected accounts page: `apps/web/src/features/auth/pages/ConnectedAccountsPage.tsx`
