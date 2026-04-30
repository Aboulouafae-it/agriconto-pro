# Frontend UX Security

The AgriConto Pro frontend improves usability but is never the security authority. All access control must be enforced by the FastAPI backend.

## Assumptions

- The browser is an untrusted client.
- Users can modify JavaScript, localStorage, route parameters and hidden UI state.
- UI role checks only hide actions. They do not grant access.
- Every API call must be authorized server-side using the authenticated user, farm membership and role.

## Token Storage

The current development foundation stores access tokens in `localStorage`.

Benefits:

- simple for local development;
- works with stateless bearer-token API calls;
- avoids early cookie/CSRF complexity.

Risks:

- any successful XSS can read the token;
- browser extensions or compromised devices can access localStorage;
- logout is local token deletion, not server-side revocation.

Mitigations in this phase:

- no use of `dangerouslySetInnerHTML`;
- generic error messages;
- no secrets in frontend environment variables;
- typed API wrapper attaches tokens consistently;
- 401 clears the token and forces re-authentication.

Future production option:

- short-lived access token in memory;
- refresh token in HttpOnly, Secure, SameSite cookie;
- CSRF protection for cookie-authenticated state-changing requests;
- token rotation and replay detection.

## Role-Aware UI

The UI hides actions based on a local role model:

- `OWNER`: full operational UI;
- `ACCOUNTANT`: financial, document and report views;
- `LABOR_CONSULTANT`: worker and workday views;
- `WORKER`: limited future self-service UI.

This is only a UX hint. The backend remains authoritative.

## Error Handling

- `401`: session expired, token removed locally.
- `403`: permission denied, shown without sensitive backend details.
- `5xx`: generic service unavailable message.
- Raw server traces, SQL errors and internal paths must never be displayed.

## Form Validation

React Hook Form and Zod provide client-side validation for fast feedback. Backend Pydantic validation remains mandatory and is the source of truth.

## XSS and Content Handling

- Do not use `dangerouslySetInnerHTML`.
- Render user-generated text as React text nodes.
- If future rich text or HTML comments are introduced, sanitize with a maintained sanitizer and restrict allowed tags.
- Avoid putting tokens or sensitive data in URLs.

## Environment Variables

Only `VITE_` variables are exposed to the browser. They must contain public configuration only, such as API base URL. Secrets must stay in backend environment variables.

## File Upload UX

The frontend may collect files, but upload validation is not security. The backend validates MIME type, size, names, storage keys and permissions.
