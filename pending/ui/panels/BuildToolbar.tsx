import type React from "react";
import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	BUILDING_COSTS,
	getActivePlacement,
	type PlaceableType,
	setActivePlacement,
} from "../../systems/buildingPlacement";
import { HudButton } from "../components/HudButton";
import { useResourcePool } from "../hooks/useResourcePool";
import { BoltIcon, FactoryIcon } from "../icons";

type BuildableType = Exclude<PlaceableType, null>;

export function BuildToolbar() {
	// Subscribe to game ticks so getActivePlacement() stays current.
	useSyncExternalStore(subscribe, getSnapshot);
	const active = getActivePlacement();
	const resources = useResourcePool();

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
		<div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
			<div className="w-[160px] md:w-[214px] rounded-[20px] md:rounded-[24px] border border-white/10 bg-[#081017]/90 p-2 md:p-3 shadow-2xl">
				<span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-white/45">
					Construct
				</span>
				<span className="mt-0.5 md:mt-1 font-mono text-xs md:text-sm uppercase tracking-[0.14em] text-[#defef3] block">
					Field Deployment
				</span>
				<div className="mt-3 flex flex-col gap-2">
					{items.map(({ type, label, meta, icon }) => {
						const isActive = active === type;
						const costs = BUILDING_COSTS[type];
						const canAfford = costs.every(
							(cost) =>
								((resources as Record<string, number>)[cost.type] ?? 0) >=
								cost.amount,
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
								variant="utility"
								onPress={() => setActivePlacement(isActive ? null : type)}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
