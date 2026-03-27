import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Register playtest bridge (window.__syntheteria) for E2E tests
import "./systems/playtestBridge";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootEl);
root.render(
	<StrictMode>
		<App />
	</StrictMode>,
);
