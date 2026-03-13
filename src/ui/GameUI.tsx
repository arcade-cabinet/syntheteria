import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { CityKitLab } from "../city/runtime/CityKitLab";
import { closeCityKitLab } from "../world/cityTransition";
import { getRuntimeState, subscribeRuntimeState } from "../world/runtimeState";
import "../systems/radialProviders"; // Register radial menu action providers at startup
import "../systems/turnPhaseHandlers"; // Register AI faction + environment phase handlers
import { BriefingBubbleLayer } from "./BriefingBubbleLayer";
import { CitySiteOverlay } from "./CitySiteOverlay";
import { GameHUD } from "./panels/GameHUD";
import { HarvestNotifications } from "./panels/HarvestNotifications";
import { Notifications } from "./panels/Notifications";
import { ThoughtOverlay } from "./panels/ThoughtOverlay";
import { RadialMenu } from "./RadialMenu";

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
 * - BriefingBubbleLayer: anchored local context
 * - CitySiteOverlay: explicit site/district briefings opened by radial actions
 * - Minimap: tactical overview
 * - ThoughtOverlay: AI narration
 * - RadialMenu: all contextual actions
 */
export function GameUI() {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const worldInteractive = runtime.currentTick > 0;

	return (
		<View className="absolute inset-0 pointer-events-none" testID="game-scene-ready">
			<GameHUD />
			{worldInteractive && <Notifications />}
			{worldInteractive && <HarvestNotifications />}
			{worldInteractive && <BriefingBubbleLayer />}
			<CitySiteOverlay />
			{runtime.cityKitLabOpen && <CityKitLab onClose={closeCityKitLab} />}
			<ThoughtOverlay />
			<RadialMenu />
		</View>
	);
}
