import ReactDOM from "react-dom/client";
import HavokPhysics from "@babylonjs/havok";
import { PocApp } from "./PocApp";
import "./index.css";

(async () => {
	const root = ReactDOM.createRoot(
		document.getElementById("root") as HTMLElement,
	);
	const havok = await HavokPhysics();
	root.render(<PocApp havok={havok} />);
})();
