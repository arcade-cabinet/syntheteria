import ReactDOM from "react-dom/client";
import HavokPhysics from "@babylonjs/havok";
import App from "./App";
import "./index.css";

(async () => {
	const rootEl = document.getElementById("root");
	if (!rootEl) throw new Error("Root element not found");

	const root = ReactDOM.createRoot(rootEl);
	const havok = await HavokPhysics();
	root.render(<App havok={havok} />);
})();
