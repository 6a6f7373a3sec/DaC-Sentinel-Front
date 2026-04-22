# Account Password Change Specification

## Purpose

Definir el comportamiento del frontend para que un usuario autenticado cambie su propia contraseña desde la aplicación.

## Requirements

### Requirement: Authenticated password change access

The system MUST expose a password change flow only to authenticated users inside the protected application shell.

#### Scenario: Authenticated user opens the change password flow
- GIVEN an authenticated user is inside the app
- WHEN the user triggers the password change entry point
- THEN the frontend SHALL navigate to the protected password change view

#### Scenario: Unauthenticated user cannot access the flow
- GIVEN there is no valid authenticated session
- WHEN the browser navigates to the password change hash route
- THEN the frontend MUST redirect the user to `#/login`

### Requirement: Password change form validation

The system MUST require the current password, the new password, and a confirmation field before submitting the change request.

#### Scenario: Prevent submission with mismatched confirmation
- GIVEN the user entered a new password and a different confirmation value
- WHEN the user submits the form
- THEN the frontend MUST NOT call the API
- AND it MUST show a validation message in the current view

#### Scenario: Submit a valid password change payload
- GIVEN the user entered current password, valid new password, and matching confirmation
- WHEN the user submits the form
- THEN the frontend SHALL call `POST /auth/change-password`
- AND it SHALL send `current_password` and `new_password`

### Requirement: Success handling after password change

The system MUST give explicit success feedback and clear sensitive form state after a successful password change.

#### Scenario: Password changes without reauthentication
- GIVEN the backend accepts the request and does not require immediate re-login
- WHEN the response completes successfully
- THEN the frontend SHALL show a success message
- AND it SHALL clear current, new, and confirmation password fields

#### Scenario: Password changes and backend requires reauthentication
- GIVEN the backend returns a success response indicating `reauth_required`
- WHEN the frontend processes the response
- THEN it MUST log the user out gracefully
- AND it MUST return the user to `#/login` with a success context

### Requirement: API error handling

The system MUST preserve the user context and surface actionable feedback when the password change request fails.

#### Scenario: Current password is invalid
- GIVEN the backend rejects the change because the current password is incorrect
- WHEN the response is received
- THEN the frontend MUST show the backend error message or a mapped equivalent
- AND it MUST keep the user on the password change view

#### Scenario: New password violates policy
- GIVEN the backend rejects the new password due to policy rules
- WHEN the response is received
- THEN the frontend MUST show an actionable validation error
- AND it MUST preserve the non-sensitive page context
