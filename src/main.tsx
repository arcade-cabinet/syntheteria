/**
 * Vite + Capacitor entry. R3F-only game; no Expo/RN.
 * Uses Capacitor SQLite for persistence (web: IndexedDB, native: SQLite).
 * Session runs on an in-memory sql.js DB synced to/from Capacitor on save/load.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./AppVite";
import { setDatabaseResolver } from "./db/runtime";
import {
	createSessionDbSync,
	initCapacitorDbForVite,
} from "./db/viteCapacitorSession";
import "@root/global.css";

async function init() {
	// Capacitor SQLite: web (IndexedDB) and native. Schema + persistence.
	await initCapacitorDbForVite();
	// Session DB (sync API): in-memory sql.js, bootstrapped and seeded.
	const db = await createSessionDbSync();
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
