/**
 * Vite + Capacitor entry. R3F-only game; no Expo/RN.
 * Inits in-memory DB (sql.js) then mounts the app.
 * When running in Capacitor native shell, also inits Capacitor SQLite and runs schema there for future persistence.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./AppVite";
import { setDatabaseResolver } from "./db/runtime";
import { createTestDb } from "./db/testDb";
import { isCapacitorNative } from "./platform";
import "@root/global.css";

async function init() {
	if (isCapacitorNative) {
		const { initCapacitorDb } = await import("./db/capacitorDb");
		const { runBootstrapCapacitor } = await import("./db/capacitorBootstrap");
		await initCapacitorDb();
		await runBootstrapCapacitor();
	}
	const db = await createTestDb();
	setDatabaseResolver(() => db);

	const rootEl = document.getElementById("root");
	if (!rootEl) throw new Error("Missing #root");
	createRoot(rootEl).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

init().catch((err) => {
	console.error("Failed to init app", err);
	const pre = document.createElement("pre");
	pre.style.cssText = "color:#ff8f8f;padding:24px";
	pre.textContent = `Signal Lost\n\n${err?.message ?? String(err)}`;
	document.body.appendChild(pre);
});
