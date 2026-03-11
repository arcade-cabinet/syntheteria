import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import { buildings } from "../../ecs/world";
import { HudButton } from "../components/HudButton";

function stormColor(intensity: number): string {
	if (intensity > 1.1) return "text-amber-500";
	if (intensity > 0.8) return "text-emerald-400";
	return "text-emerald-400/60";
}

export function TopBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const fragmentCount = snap.fragments.length;
	const buildingCount = Array.from(buildings).length;

	return (
		<View className="absolute top-0 left-0 w-full pt-safe pointer-events-none">
			<View className="bg-black/80 border-b border-emerald-500/30 p-2 flex-row justify-between items-center pointer-events-auto">
				{/* Status counts */}
				<View className="flex-row gap-4">
					<Text className="font-mono text-sm text-emerald-400">
						UNITS: {snap.unitCount}
					</Text>
					<Text className="font-mono text-sm text-emerald-400">
						BLDG: {buildingCount}
					</Text>
					{snap.enemyCount > 0 && (
						<Text className="font-mono text-sm text-red-500 font-bold">
							HOSTILE: {snap.enemyCount}
						</Text>
					)}
					<Text className="font-mono text-sm text-emerald-400/60">
						FRAG: {fragmentCount}
					</Text>
				</View>

				{/* Speed controls */}
				<View className="flex-row gap-2">
					{([0.5, 1, 2] as const).map((s) => (
						<HudButton
							key={s}
							label={`${s}x`}
							active={snap.gameSpeed === s && !snap.paused}
							onPress={() => setGameSpeed(s)}
							className="py-1 px-3 min-h-[32px]"
						/>
					))}
					<HudButton
						label={snap.paused ? "PLAY" : "PAUSE"}
						active={snap.paused}
						variant={snap.paused ? "secondary" : "primary"}
						onPress={togglePause}
						className="py-1 px-3 min-h-[32px] ml-2"
					/>
				</View>
			</View>

			{/* Resource bar */}
			<View className="bg-black/60 border-b border-emerald-500/20 p-1 flex-row gap-4 px-4 justify-center">
				<Text className="font-mono text-xs text-emerald-400/80">
					SCRAP: {snap.resources.scrapMetal}
				</Text>
				<Text className="font-mono text-xs text-emerald-400/80">
					E-WASTE: {snap.resources.eWaste}
				</Text>
				<Text className="font-mono text-xs text-emerald-400/80">
					PARTS: {snap.resources.intactComponents}
				</Text>
				<Text
					className={`font-mono text-xs ${stormColor(snap.power.stormIntensity)}`}
				>
					STORM: {(snap.power.stormIntensity * 100).toFixed(0)}%
				</Text>
				<Text className="font-mono text-xs text-emerald-400/80">
					PWR: {snap.power.totalGeneration.toFixed(0)}/
					{snap.power.totalDemand.toFixed(0)}
				</Text>
			</View>
		</View>
	);
}
