# SMTP Configuration Guide

This project supports two email modes:

- `console` (development): prints email payloads to logs.
- `smtp` (staging/production): sends real email through an SMTP server.

## Environment Variables

Required when using SMTP:

- `EMAIL_PROVIDER=smtp`
- `SMTP_HOST`
- `SMTP_PORT` (typically `587` or `465`)
- `SMTP_SECURE` (`true` for implicit TLS, usually port `465`; otherwise `false`)
- `SMTP_USER` (optional when relay allows unauthenticated sender)
- `SMTP_PASS` (required when `SMTP_USER` is set)
- `SMTP_CONNECTION_TIMEOUT` (optional)
- `SMTP_SOCKET_TIMEOUT` (optional)

Development console mode:

- `EMAIL_PROVIDER=console`

## Example

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer@example.com
SMTP_PASS=app-password
SMTP_CONNECTION_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=10000
```

## Startup Verification

On boot, the email client runs an optional SMTP verification check (`verifyOnBoot`) and logs:

- success when SMTP is reachable
- warning/error when SMTP is unreachable

This check is non-blocking: server boot continues even if SMTP verification fails.

## Operational Notes

- Use `console` provider locally unless you specifically need real delivery tests.
- Use app passwords or provider-scoped credentials, never personal account passwords.
- Rotate SMTP credentials and restart services after rotation.
