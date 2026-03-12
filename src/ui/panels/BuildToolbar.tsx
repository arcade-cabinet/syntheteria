import type React from "react";
import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	BUILDING_COSTS,
	getActivePlacement,
	type PlaceableType,
	setActivePlacement,
} from "../../systems/buildingPlacement";
import { HudButton } from "../components/HudButton";
import { BoltIcon, FactoryIcon } from "../icons";

type BuildableType = Exclude<PlaceableType, null>;

export function BuildToolbar() {
	const active = getActivePlacement();
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	const items: Array<{
		type: BuildableType;
		label: string;
		meta: string;
		icon: React.ReactNode;
	}> = [
		{
			type: "lightning_rod",
			label: "Lightning Rod",
			meta: "power relay",
			icon: <BoltIcon width={18} height={18} color="#f6c56a" />,
		},
		{
			type: "fabrication_unit",
			label: "Fabricator",
			meta: "assembly node",
			icon: <FactoryIcon width={18} height={18} color="#89d9ff" />,
		},
	];

	return (
		<View className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
			<View className="w-[214px] rounded-[24px] border border-white/10 bg-[#081017]/90 p-3 shadow-2xl">
				<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
					Construct
				</Text>
				<Text className="mt-1 font-mono text-sm uppercase tracking-[0.14em] text-[#defef3]">
					Field Deployment
				</Text>
				<View className="mt-3 gap-2">
					{items.map(({ type, label, meta, icon }) => {
						const isActive = active === type;
						const costs = BUILDING_COSTS[type];
						const canAfford = costs.every(
							(cost) => snap.resources[cost.type] >= cost.amount,
						);
						const costMeta = costs
							.map((cost) => `${cost.amount} ${cost.type}`)
							.join(" / ");

						return (
							<HudButton
								key={type}
								label={label}
								meta={`${meta} • ${costMeta}`}
								icon={icon}
								active={isActive}
								disabled={!canAfford}
								variant={type === "fabrication_unit" ? "secondary" : "primary"}
								onPress={() => setActivePlacement(isActive ? null : type)}
							/>
						);
					})}
				</View>
			</View>
		</View>
	);
}
