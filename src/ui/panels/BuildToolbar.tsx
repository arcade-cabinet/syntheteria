import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	BUILDING_COSTS,
	getActivePlacement,
	type PlaceableType,
	setActivePlacement,
} from "../../systems/buildingPlacement";
import { HudButton } from "../components/HudButton";

export function BuildToolbar() {
	const active = getActivePlacement();
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	const items: { type: PlaceableType; label: string }[] = [
		{ type: "lightning_rod", label: "ROD" },
		{ type: "fabrication_unit", label: "FAB" },
	];

	return (
		<View className="absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-3 pointer-events-auto">
			{items.map(({ type, label }) => {
				const isActive = active === type;
				const costs = BUILDING_COSTS[type!];
				const canAfford = costs.every(
					(c) => snap.resources[c.type] >= c.amount,
				);

				return (
					<HudButton
						key={type}
						label={label}
						active={isActive}
						disabled={!canAfford}
						onPress={() => setActivePlacement(isActive ? null : type)}
						className="w-14 h-14"
					/>
				);
			})}
		</View>
	);
}
