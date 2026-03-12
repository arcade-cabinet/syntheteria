import type React from "react";
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
import {
	BoltIcon,
	DroneIcon,
	MapIcon,
	PauseIcon,
	PlayIcon,
	ShardIcon,
	StormIcon,
} from "../icons";

function StatChip({
	label,
	value,
	icon,
	tone = "mint",
}: {
	label: string;
	value: string | number;
	icon: React.ReactNode;
	tone?: "mint" | "amber" | "crimson";
}) {
	const toneClass =
		tone === "amber"
			? "border-[#f6c56a]/24 bg-[#2b1d08]/75 text-[#ffe9b0]"
			: tone === "crimson"
				? "border-[#ff8f8f]/24 bg-[#2b0f10]/75 text-[#ffd7d7]"
				: "border-[#6ff3c8]/24 bg-[#0a1718]/78 text-[#d9fff3]";

	return (
		<View className={`min-w-[112px] rounded-2xl border px-3 py-2 ${toneClass}`}>
			<View className="flex-row items-center gap-2">
				<View className="h-5 w-5 items-center justify-center">{icon}</View>
				<Text className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
					{label}
				</Text>
			</View>
			<Text className="mt-2 font-mono text-base tracking-[0.12em]">
				{value}
			</Text>
		</View>
	);
}

export function TopBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const fragmentCount = snap.fragments.length;
	const buildingCount = Array.from(buildings).length;

	return (
		<View className="absolute left-0 top-0 w-full pt-safe pointer-events-none">
			<View className="mx-4 mt-3 gap-3">
				<View className="pointer-events-auto flex-row items-start justify-between gap-4">
					<View className="max-w-[60%] flex-row flex-wrap gap-2">
						<View className="rounded-[22px] border border-[#6ff3c8]/25 bg-[#071117]/90 px-4 py-3 shadow-2xl">
							<Text className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#7ee7cb]">
								Synth Network
							</Text>
							<Text className="mt-1 font-mono text-lg uppercase tracking-[0.18em] text-[#e2fff5]">
								Storm Command Uplink
							</Text>
						</View>
						<StatChip
							label="Units"
							value={snap.unitCount}
							icon={<DroneIcon width={16} height={16} color="#7ee7cb" />}
						/>
						<StatChip
							label="Structures"
							value={buildingCount}
							icon={<BoltIcon width={16} height={16} color="#f6c56a" />}
							tone="amber"
						/>
						<StatChip
							label="Fragments"
							value={fragmentCount}
							icon={<MapIcon width={16} height={16} color="#89d9ff" />}
						/>
						{snap.enemyCount > 0 && (
							<StatChip
								label="Hostiles"
								value={snap.enemyCount}
								icon={<ShardIcon width={16} height={16} color="#ff8f8f" />}
								tone="crimson"
							/>
						)}
					</View>

					<View className="pointer-events-auto min-w-[248px] rounded-[22px] border border-white/10 bg-[#071117]/92 p-3 shadow-2xl">
						<Text className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
							Sim Control
						</Text>
						<View className="mt-3 flex-row gap-2">
							{([0.5, 1, 2] as const).map((s) => (
								<HudButton
									key={s}
									label={`${s}x`}
									meta="clock rate"
									active={snap.gameSpeed === s && !snap.paused}
									onPress={() => setGameSpeed(s)}
									className="flex-1"
								/>
							))}
							<HudButton
								label={snap.paused ? "Resume" : "Pause"}
								meta={snap.paused ? "simulation halted" : "live simulation"}
								active={snap.paused}
								variant={snap.paused ? "secondary" : "primary"}
								icon={
									snap.paused ? (
										<PlayIcon width={16} height={16} color="#89d9ff" />
									) : (
										<PauseIcon width={16} height={16} color="#7ee7cb" />
									)
								}
								onPress={togglePause}
								className="min-w-[122px]"
							/>
						</View>
					</View>
				</View>

				<View className="pointer-events-auto flex-row flex-wrap gap-2">
					<StatChip
						label="Scrap"
						value={snap.resources.scrapMetal}
						icon={<ShardIcon width={16} height={16} color="#7ee7cb" />}
					/>
					<StatChip
						label="E-Waste"
						value={snap.resources.eWaste}
						icon={<MapIcon width={16} height={16} color="#89d9ff" />}
					/>
					<StatChip
						label="Parts"
						value={snap.resources.intactComponents}
						icon={<BoltIcon width={16} height={16} color="#f6c56a" />}
						tone="amber"
					/>
					<StatChip
						label="Storm"
						value={`${(snap.power.stormIntensity * 100).toFixed(0)}%`}
						icon={<StormIcon width={16} height={16} color="#f6c56a" />}
						tone="amber"
					/>
					<StatChip
						label="Power"
						value={`${snap.power.totalGeneration.toFixed(0)} / ${snap.power.totalDemand.toFixed(0)}`}
						icon={<BoltIcon width={16} height={16} color="#7ee7cb" />}
					/>
				</View>
			</View>
		</View>
	);
}
