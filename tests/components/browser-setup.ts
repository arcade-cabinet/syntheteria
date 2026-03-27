/**
 * Browser test setup — loads Tailwind CSS and suppresses known BabylonJS errors.
 *
 * Without this, individual component tests render without styles
 * because only the full App imports src/index.css.
 *
 * The postProcessManager suppression handles a known BabylonJS race condition
 * where rgbdTextureTools fires an async callback after scene disposal.
 */
import "../../src/index.css";

// Suppress BabylonJS postProcessManager race condition during engine teardown.
// This is a BabylonJS internal bug — the engine disposes the scene but an
// async RGBD texture expansion callback fires after the scene is null.
window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
	if (e.reason?.message?.includes("postProcessManager")) {
		e.preventDefault();
	}
});
