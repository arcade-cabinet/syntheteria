/**
 * Playwright component testing entry. Apply theme, global styles, or providers
 * needed for mounted components. Components run in a real browser; tests run in Node.
 */
import { beforeMount } from "@playwright/experimental-ct-react/hooks";

beforeMount(async () => {
	// Optional: inject global CSS or providers for all component tests
});
