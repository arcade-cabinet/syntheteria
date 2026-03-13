import { useCallback, useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { CityKitLab } from "../city/runtime/CityKitLab";
import { setPaused } from "../ecs/gameState";
import { setAutosaveNotify } from "../systems/autosave";
import { installKeyboardShortcuts } from "../systems/keyboardShortcuts";
import { pushToast } from "../systems/toastStore";
import { closeCityKitLab } from "../world/cityTransition";
import { getRuntimeState, subscribeRuntimeState } from "../world/runtimeState";
import "../systems/radialProviders"; // Register radial menu action providers at startup
import "../systems/turnPhaseHandlers"; // Register AI faction + environment phase handlers
import "../systems/autosave"; // Register autosave environment phase handler
import { registerAudioTick } from "../ecs/gameState";
import { audioSystemTick } from "../audio";
registerAudioTick(audioSystemTick); // Wire audio event processing into game loop
import { CitySiteOverlay } from "./CitySiteOverlay";
import { PauseMenu } from "./PauseMenu";
import { GameHUD } from "./panels/GameHUD";
import { EntityTooltip } from "./panels/EntityTooltip";
import { HarvestNotifications } from "./panels/HarvestNotifications";
import { KeybindHints } from "./panels/KeybindHints";
import { Notifications } from "./panels/Notifications";
import { PlacementHUD } from "./panels/PlacementHUD";
import { SystemToasts } from "./panels/SystemToasts";
import { ThoughtOverlay } from "./panels/ThoughtOverlay";
import { ToastStack } from "./panels/ToastStack";
import { TurnPhaseOverlay } from "./panels/TurnPhaseOverlay";
import { DiplomacyModal } from "./DiplomacyModal";
import { OtterHologramOverlay } from "./OtterHologramOverlay";
import { RadialMenu } from "./RadialMenu";
import { TechTreeModal } from "./TechTreeModal";
import { VictoryOverlay } from "./VictoryOverlay";

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
 * - CitySiteOverlay: explicit site/district briefings opened by radial actions
 * - Minimap: tactical overview
 * - ThoughtOverlay: AI narration
 * - RadialMenu: all contextual actions
 */
export function GameUI({ onQuitToTitle }: { onQuitToTitle?: () => void }) {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const worldInteractive = runtime.currentTick > 0;
	const [pauseOpen, setPauseOpen] = useState(false);
	const [techTreeOpen, setTechTreeOpen] = useState(false);
	const [diplomacyOpen, setDiplomacyOpen] = useState(false);

	const handlePauseOpen = useCallback(() => {
		setPauseOpen(true);
		setPaused(true);
	}, []);

	const handleResume = useCallback(() => {
		setPauseOpen(false);
		setPaused(false);
	}, []);

	const handleQuitToTitle = useCallback(() => {
		setPauseOpen(false);
		setPaused(false);
		onQuitToTitle?.();
	}, [onQuitToTitle]);

	// Wire autosave notifications into the toast system
	useEffect(() => {
		setAutosaveNotify((result) => {
			if (result.success) {
				pushToast(`Autosaved — Turn ${result.turnNumber}`, "info");
			}
		});
		return () => setAutosaveNotify(null);
	}, []);

	// Install global keyboard shortcuts
	useEffect(() => {
		return installKeyboardShortcuts(handlePauseOpen);
	}, [handlePauseOpen]);

	return (
		<View className="absolute inset-0 pointer-events-none" testID="game-scene-ready">
			<GameHUD
				onPause={handlePauseOpen}
				onTechTree={() => setTechTreeOpen(true)}
				onDiplomacy={() => setDiplomacyOpen(true)}
			/>
			{worldInteractive && <Notifications />}
			{worldInteractive && <HarvestNotifications />}
			<CitySiteOverlay />
			{runtime.cityKitLabOpen && <CityKitLab onClose={closeCityKitLab} />}
			<TurnPhaseOverlay />
			<ThoughtOverlay />
			<RadialMenu />
			<EntityTooltip />
			<PlacementHUD />
			<ToastStack />
			<KeybindHints />
			<SystemToasts />
			<PauseMenu
				visible={pauseOpen}
				onResume={handleResume}
				onQuitToTitle={handleQuitToTitle}
			/>
			<VictoryOverlay onReturnToTitle={handleQuitToTitle} />
			<TechTreeModal
				visible={techTreeOpen}
				onClose={() => setTechTreeOpen(false)}
			/>
			<DiplomacyModal
				visible={diplomacyOpen}
				onClose={() => setDiplomacyOpen(false)}
			/>
			<OtterHologramOverlay />
		</View>
	);
}
