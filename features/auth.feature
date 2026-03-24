Feature: Authentication
  Admin access is protected by a proper authentication system with
  secure password storage, session management, and defense-in-depth.
  There is no self-registration — the admin account is created via
  a server-side CLI script.

  # --- Account provisioning ---

  Scenario: Admin account is created via CLI script
    When the operator runs the create-admin script with a username and password
    Then an admin record should be stored with the password as an argon2id hash
    And the plaintext password should never be stored or logged

  Scenario: Password must meet minimum complexity
    When the operator attempts to create an admin with a password shorter than 12 characters
    Then the script should reject it with a message about minimum requirements

  # --- Login ---

  Scenario: Successful login
    Given a valid admin account exists
    When a POST is made to /api/auth/login with correct credentials
    Then the server should respond with 200
    And set a secure HTTP-only session cookie
    And return the admin username (but not the password hash)

  Scenario: Failed login with wrong password
    When a POST is made to /api/auth/login with incorrect credentials
    Then the server should respond with 401
    And the response should not reveal whether the username or password was wrong

  Scenario: Failed login with non-existent username
    When a POST is made to /api/auth/login with a non-existent username
    Then the server should respond with 401
    And the response time should be comparable to a wrong-password attempt

  # --- Brute force protection ---

  Scenario: Login is rate-limited
    When 5 failed login attempts are made within one minute
    Then subsequent attempts should receive 429
    And the lockout should last at least 60 seconds

  Scenario: Rate limiting is per-IP
    Given IP 1.2.3.4 is locked out
    When a login attempt comes from IP 5.6.7.8
    Then it should not be rate-limited

  # --- Session management ---

  Scenario: Session cookie properties
    When the admin logs in successfully
    Then the session cookie should be HttpOnly
    And the cookie should be Secure (HTTPS-only)
    And the cookie should have SameSite=Strict
    And the cookie should have a reasonable max-age

  Scenario: Session is validated on every admin request
    Given the admin has a valid session
    When the admin makes a request to /api/admin/puzzle
    Then the session should be verified before processing

  Scenario: Expired session is rejected
    Given the admin's session has expired
    When the admin makes a request to /api/admin/puzzle
    Then the server should respond with 401

  Scenario: Invalid or tampered session cookie is rejected
    When a request is made with a malformed session cookie
    Then the server should respond with 401

  # --- Logout ---

  Scenario: Logout clears the session
    Given the admin is logged in
    When a POST is made to /api/auth/logout
    Then the session cookie should be cleared
    And subsequent requests should receive 401

  # --- CSRF protection ---

  Scenario: State-changing requests require CSRF token
    Given the admin is logged in
    When a POST request is made to an admin endpoint without a CSRF token
    Then the server should respond with 403

  Scenario: Valid CSRF token allows the request
    Given the admin is logged in and has a valid CSRF token
    When a POST request includes the CSRF token in the header
    Then the request should be processed normally

  # --- Password management ---

  Scenario: Admin can change their password
    Given the admin is logged in
    When a POST is made to /api/auth/change-password with current and new password
    Then the password should be updated in the database
    And all other sessions should be invalidated

  Scenario: Password change requires the current password
    When a POST is made to /api/auth/change-password without the current password
    Then the server should respond with 400

  Scenario: New password must meet complexity requirements
    When the admin attempts to change to a password shorter than 12 characters
    Then the server should respond with 400

  # --- Security headers ---

  Scenario: Admin routes include security headers
    When any response is served from /api/admin/*
    Then it should include X-Content-Type-Options: nosniff
    And it should include X-Frame-Options: DENY
    And it should include Cache-Control: no-store
