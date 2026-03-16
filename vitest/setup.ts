/**
 * Vitest setup: DOM matchers and no global mocks by default.
 * Tests that need DB call setDatabaseResolver(createTestDb()) in beforeAll.
 */
import "@testing-library/jest-dom/vitest";
