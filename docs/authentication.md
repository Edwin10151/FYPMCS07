# Authentication

Sign-in is delegated to Monash single sign-on. The dashboard never receives a
Monash password: the browser leaves for the identity provider, authenticates
there (including Okta Verify / MFA), and returns with a signed assertion that
the backend verifies cryptographically.

Authentication answers *who is this person*. Authorisation stays ours: the
verified email address must match an active row in `app_user`, which faculty
admins manage under **Admin → People & roles**. Somebody with a valid Monash
account but no row there is refused, with a message telling them who to ask.

## The flow

```
Browser                     Backend                    Identity provider
   |                           |                               |
   |-- click "Sign in" ------->|                               |
   |   GET /api/auth/sso/login |                               |
   |<-- 302 + state cookie ----|                               |
   |------------------------------ authorize?code ------------>|
   |                           |                               |
   |            [ email + password + Okta Verify happens here ]|
   |                           |                               |
   |<----------------------------- 302 back with ?code --------|
   |-- GET /api/auth/sso/callback ->|                          |
   |                           |-- POST token endpoint ------->|
   |                           |<-- id_token ------------------|
   |                           |   verify signature (JWKS),
   |                           |   issuer, audience, nonce
   |                           |   look up email in app_user
   |<-- 302 /auth/callback#token=… |
   |   frontend stores session, lands on /units
```

Security properties worth knowing:

- **State + nonce.** A random nonce is signed into the `state` parameter and
  also set as an httpOnly cookie. The callback requires both to agree, so a
  forged callback from another site is rejected.
- **Signature verification.** The ID token is checked against the provider's
  published JWKS keys, with the issuer and audience pinned. An unsigned or
  third-party token will not pass.
- **Token in the fragment.** The backend returns the dashboard session in the
  URL fragment (`#token=…`), which browsers never transmit to a server, keeping
  it out of proxy logs and `Referer` headers. The frontend reads it once and
  wipes it from the address bar.

## Modes

Set with `AUTH_MODE`.

### `dev` (default)

The backend serves a stand-in provider at `/api/auth/sso/dev-idp`. It performs
the identical redirect round-trip, but asks only for an email address and checks
no password. This exists so the whole flow can be developed, demonstrated, and
tested without any external registration.

It lists the provisioned accounts, and also lets you authenticate as an
arbitrary address — useful for seeing the "no dashboard account" refusal.

`/api/auth/sso/dev-idp` returns 404 unless `AUTH_MODE=dev`, so it cannot be
reached in a real deployment.

### `oidc`

Talks to a real provider. Requires these values in `.env`:

| Variable | Meaning |
|---|---|
| `AUTH_MODE` | `oidc` |
| `OIDC_ISSUER` | Provider base URL, e.g. `https://login.monash.edu` |
| `OIDC_CLIENT_ID` | Issued by eSolutions when they register this app |
| `OIDC_CLIENT_SECRET` | Issued by eSolutions |
| `OIDC_REDIRECT_URI` | Must be whitelisted by them, character for character |
| `APP_BASE_URL` | Public address of the frontend |

Optional: `OIDC_SCOPES` (default `openid profile email`),
`OIDC_DISCOVERY_URL` (when the discovery document is not at the conventional
path), and `OIDC_EMAIL_CLAIMS` (claims searched in order for the Monash
address — Azure AD often uses `preferred_username` rather than `email`).

**Switching modes needs no code change.** Fill in the values, set
`AUTH_MODE=oidc`, restart the backend.

### Signing in through Google

Both `monash.edu` and `student.monash.edu` are Google Workspace tenants, and
Monash federates them to Okta. Pointing this app at Google therefore reaches the
same Okta Verify prompt, using an OAuth client you can create yourself in the
Google Cloud console rather than one eSolutions has to issue:

```
AUTH_MODE=oidc
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=<Google Cloud console>
OIDC_CLIENT_SECRET=<Google Cloud console>
OIDC_HOSTED_DOMAINS=monash.edu,student.monash.edu
```

`OIDC_HOSTED_DOMAINS` does two separate jobs:

1. It sends Google an `hd` hint on the authorize request, so the account picker
   offers Workspace accounts rather than personal ones. This is only a hint.
2. It checks the `hd` claim on the ID token that comes back, which is the part
   that actually binds the identity to Monash. `enforce_identity_policy()` does
   this, and prefers the claim over the email address, because the signature
   vouches for the claim. Providers that send no `hd` (Okta among them) fall back
   to the address domain.

The `email_verified` claim is also required not to be false.

This is an interim arrangement: the client belongs to whoever created the Google
Cloud project. Moving to a Monash-issued Okta client is three environment
variables and no code change, which is why the module talks OIDC discovery
rather than anything provider-specific.

## The one thing that cannot be done in code

Monash's identity provider will reject an unregistered `client_id` /
`redirect_uri`. You must ask eSolutions to register this application, and they
return the client ID, client secret, and issuer URL. That is the whole point of
the protocol — no application can obtain verified identities from an IdP that
has not agreed to trust it.

Request from eSolutions:

- An **OIDC confidential client** (authorization code flow)
- Scopes `openid profile email`
- Redirect URI whitelisted: your `OIDC_REDIRECT_URI`, e.g.
  `https://<your-host>/api/auth/sso/callback`

Until that arrives, `AUTH_MODE=dev` demonstrates the identical flow end to end.

## Break-glass local sign-in

`POST /api/auth/login` still accepts an email and a locally stored password,
reached from "Faculty admin sign-in" on the login page. It exists so a provider
outage cannot lock faculty admins out of the dashboard.

- `LOCAL_LOGIN_MANAGEMENT_ONLY=true` (default) limits it to management accounts;
  coordinators and lecturers must use SSO.
- `LOCAL_LOGIN_ENABLED=false` removes the path entirely.

Accounts created under Admin → People & roles still receive a one-time
temporary password, which is what this path consumes. Coordinators and lecturers
can ignore it and sign in with SSO.

## Provisioned accounts

`app/provision.py` runs on every startup and is idempotent, so an existing
database picks up new team accounts without being rebuilt. `TEAM_ACCOUNTS`
lists them:

| Email | Role |
|---|---|
| `wlim0083@student.monash.edu` | coordinator |

These rows carry a sentinel `password_hash` that no input can match, so the
account exists solely to be matched by a verified SSO identity.

`ALLOWED_EMAIL_DOMAINS` (default `monash.edu,student.monash.edu`) controls which
addresses an admin may provision from Admin -> People & roles.

The same module creates the **FIT3161 Computer science project 1** offering for
S2 2026, coordinated by the account above. It creates the skeleton only: unit,
semester, offering, and four placeholder assessments totalling 100%.

Two things are deliberately left to the coordinator, because inventing them
would break real uploads:

1. **Enrolments.** A grade upload matches each row against the offering's
   enrolled students, and an unrecognised student ID is a hard error. Upload the
   class list under **Admin -> Enrolments** before uploading grades.
2. **Learning outcomes.** Import them from the handbook on the unit page; the
   handbook URL is already set on the offering.

Adjust the assessment names and weights on the Assessments page so they match
the columns in your gradebook.
