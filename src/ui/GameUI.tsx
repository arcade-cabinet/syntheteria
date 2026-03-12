import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { CityKitLab } from "../city/runtime/CityKitLab";
import { closeCityKitLab } from "../world/cityTransition";
import { getRuntimeState, subscribeRuntimeState } from "../world/runtimeState";
import "../systems/radialProviders"; // Register radial menu action providers at startup
import { RadialMenu } from "./RadialMenu";
import { LocationPanel } from "./panels/LocationPanel";
import { Minimap } from "./panels/Minimap";
import { Notifications } from "./panels/Notifications";
import { ResponsiveTopBar } from "./panels/ResourceStrip";
import { ThoughtOverlay } from "./panels/ThoughtOverlay";

/**
 * GameUI — top-level HUD composition.
 *
 * The radial context menu (right-click / long-press) replaces SelectedInfo
 * and BuildToolbar entirely. All contextual actions (repair, fabricate,
 * build, move, attack, etc.) are accessed through the radial menu's
 * composable provider system.
 *
 * Persistent HUD elements:
 * - ResponsiveTopBar: resources, storm %, day counter, pause
 * - Notifications: combat alerts, merge events
 * - LocationPanel: world/city location context
 * - Minimap: tactical overview
 * - ThoughtOverlay: AI narration
 * - RadialMenu: all contextual actions
 */
export function GameUI() {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);

	return (
		<View className="absolute inset-0 pointer-events-none">
			<ResponsiveTopBar />
			<Notifications />
			<LocationPanel />
			{runtime.activeScene === "world" && <Minimap />}
			{runtime.cityKitLabOpen && <CityKitLab onClose={closeCityKitLab} />}
			<ThoughtOverlay />
			<RadialMenu />
		</View>
	);
}
