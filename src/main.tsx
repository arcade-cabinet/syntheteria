import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Suppress THREE.Clock deprecation warnings from R3F v9 internals.
// R3F uses THREE.Clock which was deprecated in Three.js r183 in favor of Timer.
// This is an upstream issue — cannot fix without patching R3F.
if (import.meta.env.DEV) {
	const origWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		if (typeof args[0] === "string") {
			// R3F v9 uses deprecated THREE.Clock (fixed in future R3F releases)
			if (args[0].includes("THREE.Clock")) return;
			// Tone.js scheduling warnings during audio context resume
			if (args[0].includes("looks like it was created with")) return;
		}
		origWarn.apply(console, args);
	};
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
