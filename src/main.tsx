/**
 * Entry point — thin mount.
 *
 * Creates the React root and renders <App /> inside <FatalErrorGate>.
 * All app logic lives in src/app/.
 */

import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { FatalErrorGate } from "./ui";
import "@root/global.css";

if (import.meta.hot) {
	import.meta.hot.accept();
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root");

const existingRoot = (rootEl as any).__reactRoot;
const reactRoot = existingRoot ?? createRoot(rootEl);
(rootEl as any).__reactRoot = reactRoot;

reactRoot.render(
	<FatalErrorGate>
		<App />
	</FatalErrorGate>,
);
