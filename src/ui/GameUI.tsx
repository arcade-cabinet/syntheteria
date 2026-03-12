import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { getSnapshot, subscribe } from "../ecs/gameState";
import { Building, Unit } from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import { getRuntimeState, subscribeRuntimeState } from "../world/runtimeState";
import { BuildToolbar } from "./panels/BuildToolbar";
import { LocationPanel } from "./panels/LocationPanel";
import { Minimap } from "./panels/Minimap";
import { Notifications } from "./panels/Notifications";
import { SelectedInfo } from "./panels/SelectedInfo";
import { ThoughtOverlay } from "./panels/ThoughtOverlay";
import { TopBar } from "./panels/TopBar";

export function GameUI() {
	const _snap = useSyncExternalStore(subscribe, getSnapshot);
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const selectedUnit = Array.from(units).find((u) => u.get(Unit)?.selected);
	const selectedBuilding = Array.from(buildings).find(
		(b) => b.get(Building)?.selected && !b.get(Unit),
	);

	const _showFabShortcut =
		!selectedUnit?.get(Unit)?.type.includes("fabrication") && !selectedBuilding;

	return (
		<View className="absolute inset-0 pointer-events-none">
			<TopBar />
			<Notifications />
			<SelectedInfo />
			<LocationPanel />
			{runtime.activeScene === "world" && (
				<>
					<BuildToolbar />
					<Minimap />
				</>
			)}
			<ThoughtOverlay />
		</View>
	);
}
