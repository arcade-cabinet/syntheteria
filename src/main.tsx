/**
 * Legacy Vite entry point — NOT used by webpack build.
 * The actual entry is src/index.tsx (webpack.config.ts → entry).
 * Kept only for the game/index.html dev fallback.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HavokPhysics from "@babylonjs/havok";
import App from "./App";
import "./index.css";

(async () => {
	const rootEl = document.getElementById("root");
	if (!rootEl) throw new Error("Root element not found");

	const havok = await HavokPhysics();
	createRoot(rootEl).render(
		<StrictMode>
			<App havok={havok} />
		</StrictMode>,
	);
})();
