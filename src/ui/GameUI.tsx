import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { View } from "react-native";
import { CityKitLab } from "../city/runtime/CityKitLab";
import {
	getSnapshot,
	registerAudioTick,
	setPaused,
	subscribe,
} from "../ecs/gameState";
import { setAutosaveNotify } from "../systems/autosave";
import { installKeyboardShortcuts } from "../systems/keyboardShortcuts";
import { pushToast } from "../systems/toastStore";
import { closeCityKitLab } from "../world/cityTransition";
import { getRuntimeState, subscribeRuntimeState } from "../world/runtimeState";
import "../systems/radialProviders"; // Register radial menu action providers at startup
import "../systems/turnPhaseHandlers"; // Register AI faction + environment phase handlers
import "../systems/autosave"; // Register autosave environment phase handler
import { audioSystemTick } from "../audio";

registerAudioTick(audioSystemTick); // Wire audio event processing into game loop

import { CitySiteOverlay } from "./CitySiteOverlay";
import { DiplomacyModal } from "./DiplomacyModal";
import { OtterHologramOverlay } from "./OtterHologramOverlay";
import { PauseMenu } from "./PauseMenu";
import { EntityTooltip } from "./panels/EntityTooltip";
import { GameHUD } from "./panels/GameHUD";
import { HarvestNotifications } from "./panels/HarvestNotifications";
import { KeybindHints } from "./panels/KeybindHints";
import { Notifications } from "./panels/Notifications";
import { PlacementHUD } from "./panels/PlacementHUD";
import { SystemToasts } from "./panels/SystemToasts";
import { ThoughtOverlay } from "./panels/ThoughtOverlay";
import { ToastStack } from "./panels/ToastStack";
import { TurnPhaseOverlay } from "./panels/TurnPhaseOverlay";
import { RadialMenu } from "./RadialMenu";
import { TechTreeModal } from "./TechTreeModal";
import {
	getLayerVisibility,
	HUD_FADE_DURATION_MS,
	nextPhase,
	type UILayerPhase,
} from "./uiLayerState";
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
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const worldInteractive = runtime.currentTick > 0;
	const [pauseOpen, setPauseOpen] = useState(false);
	const [techTreeOpen, setTechTreeOpen] = useState(false);
	const [diplomacyOpen, setDiplomacyOpen] = useState(false);

	// ─── UI layer phase state machine (US-018) ──────────────────────────
	const [phase, setPhase] = useState<UILayerPhase>("loading");
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Transition: loading -> hud-entering when worldReady flips
	useEffect(() => {
		const next = nextPhase(phase, snap.worldReady);
		if (next !== phase) {
			setPhase(next);
		}
	}, [snap.worldReady, phase]);

	// Transition: hud-entering -> hud-visible after fade duration
	useEffect(() => {
		if (phase === "hud-entering") {
			fadeTimerRef.current = setTimeout(() => {
				setPhase("hud-visible");
			}, HUD_FADE_DURATION_MS);
		}
		return () => {
			if (fadeTimerRef.current != null) {
				clearTimeout(fadeTimerRef.current);
				fadeTimerRef.current = null;
			}
		};
	}, [phase]);

	const visibility = getLayerVisibility(phase, snap.nearbyPoiName);

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
		<View
			className="absolute inset-0 pointer-events-none"
			testID="game-scene-ready"
		>
			<GameHUD
				onPause={handlePauseOpen}
				onTechTree={() => setTechTreeOpen(true)}
				onDiplomacy={() => setDiplomacyOpen(true)}
			/>
			{worldInteractive && <Notifications />}
			{worldInteractive && <HarvestNotifications />}
			{visibility.showLocationPanel && <CitySiteOverlay />}
			{runtime.cityKitLabOpen && <CityKitLab onClose={closeCityKitLab} />}
			<TurnPhaseOverlay />
			{visibility.showThoughtOverlay && <ThoughtOverlay />}
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
