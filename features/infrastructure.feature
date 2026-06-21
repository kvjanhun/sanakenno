Feature: Container Infrastructure
  The application runs in a hardened, observable Docker container that
  integrates with the existing NUC server stack.

  # --- Security & Environment ---

  @docker
  Scenario: Application runs as a non-privileged user
    Given the Sanakenno container is running
    When I check the process owner
    Then it should not be "root"
    And the process should have no write access to the root filesystem

  @docker
  Scenario: Configuration via environment variables
    Given the container is started with PORT=8081 and DATA_DIR=/data
    Then the Hono server should listen on port 8081
    And achievements should be stored in /data/achievements.db

  # --- Health & Observability ---

  Scenario: Container provides a health check endpoint
    When a GET request is made to /api/health
    Then the server should respond with 200 "OK"
    And the response should confirm the database is reachable

  Scenario: Logs are emitted in a Loki-compatible format
    When the server processes a request
    Then it should emit a structured log to stdout (console)
    And the log should include level, method, path, and response time

  # --- Multi-stage Build ---

  @docker
  Scenario: Production image is minimal
    When I inspect the production image
    Then it should not contain build tools (npm, compiler, source code)
    And it should be based on a minimal Node.js alpine image
