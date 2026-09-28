# Security

Nomad Compass is designed with security in mind.

## Authentication

- **httpOnly cookies**: Nomad ACL tokens are stored in `httpOnly` cookies,
  preventing XSS attacks from accessing tokens via JavaScript.
- **SameSite=Strict**: cookies are configured with `SameSite=Strict` to
  prevent CSRF attacks.
- **Secure flag**: in production, cookies are only sent over HTTPS.

## WebSocket security (remote exec)

The remote exec feature uses short-lived signed tickets:

1. **No token in URL**: the actual Nomad token never appears in WebSocket
   URLs.
2. **HMAC-signed tickets**: short-lived tickets (30 seconds) are
   cryptographically signed.
3. **CSRF protection**: ticket requests require valid CSRF tokens.
4. **Stateless validation**: no server-side storage needed — tickets are
   self-validating.

```
Browser                          Server                         Nomad
   │                                │                              │
   │─── POST /api/auth/ws-ticket ──>│                              │
   │    (+ CSRF header)             │                              │
   │<── { ticket: "signed..." } ────│                              │
   │                                │                              │
   │─── WebSocket + ticket ────────>│                              │
   │                                │── validate ticket            │
   │                                │── get token from cookie      │
   │                                │── connect with X-Nomad-Token>│
   │<═══════════ relay ════════════>│<═════════════════════════════│
```

## Reporting a vulnerability

Do not open a public issue. Report it privately on the
[Security tab](https://github.com/ingvarch/nomad-compass/security/advisories/new):
only the maintainer sees the report. Say what an attacker can do and how to
reproduce it.
