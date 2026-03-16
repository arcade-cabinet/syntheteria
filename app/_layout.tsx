import "../global.css";

import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

export { ErrorBoundary } from "expo-router";

// Minimal root layout — Syntheteria is a single-page game, no navigation stack needed.
// The Slot renders the current route (app/index.tsx), which mounts the full game App.
export default function RootLayout() {
	return (
		<>
			<StatusBar style="light" />
			<Slot />
		</>
	);
}
