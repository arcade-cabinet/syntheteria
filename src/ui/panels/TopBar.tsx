import type React from "react";
import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import { openCityKitLab } from "../../world/cityTransition";
import { HudButton } from "../components/HudButton";
import {
	BoltIcon,
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
	const toneText =
		tone === "amber"
			? "text-[#ffe9b0]"
			: tone === "crimson"
				? "text-[#ffd7d7]"
				: "text-[#d9fff3]";

	return (
		<View className="flex-row items-center gap-1.5 px-2">
			<View className="h-3.5 w-3.5 items-center justify-center">{icon}</View>
			<Text className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/50">
				{label}
			</Text>
			<Text className={`font-mono text-[12px] tracking-[0.08em] ${toneText}`}>
				{value}
			</Text>
		</View>
	);
}

/**
 * TopBar — minimal telemetry strip for desktop/tablet.
 *
 * Design philosophy: the HUD should frame the experience, not compete with it.
 * Resources, day counter, storm %, and sim controls in a single thin strip.
 * No headers. No panels. The radial menu and speech bubbles handle everything else.
 */
export function TopBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<View className="absolute left-0 top-0 w-full pt-safe pointer-events-none">
			<View className="pointer-events-auto mx-3 md:mx-4 mt-2 md:mt-3 flex-row items-center justify-between rounded-2xl bg-[#071117]/72 px-3 py-2 shadow-lg">
				{/* Left: resource readouts */}
				<View className="flex-row items-center gap-2">
					<StatChip
						label={`D${snap.weather.dayNumber}`}
						value={snap.weather.phase.toUpperCase()}
						icon={<StormIcon width={14} height={14} color="#b088d8" />}
						tone="amber"
					/>
					<StatChip
						label="Scrap"
						value={snap.resources.scrapMetal}
						icon={<ShardIcon width={14} height={14} color="#7ee7cb" />}
					/>
					<StatChip
						label="Parts"
						value={snap.resources.intactComponents}
						icon={<BoltIcon width={14} height={14} color="#f6c56a" />}
						tone="amber"
					/>
					<StatChip
						label="Storm"
						value={`${(snap.power.stormIntensity * 100).toFixed(0)}%`}
						icon={<StormIcon width={14} height={14} color="#f6c56a" />}
						tone="amber"
					/>
					{snap.enemyCount > 0 && (
						<StatChip
							label="Hostile"
							value={snap.enemyCount}
							icon={<ShardIcon width={14} height={14} color="#ff8f8f" />}
							tone="crimson"
						/>
					)}
				</View>

				{/* Right: sim speed + pause */}
				<View className="flex-row items-center gap-1.5">
					<HudButton
						label="Lab"
						meta="city kit"
						variant="secondary"
						testID="topbar-city-lab"
						onPress={openCityKitLab}
					/>
					{([0.5, 1, 2] as const).map((s) => (
						<HudButton
							key={s}
							label={`${s}x`}
							meta="speed"
							active={snap.gameSpeed === s && !snap.paused}
							onPress={() => setGameSpeed(s)}
						/>
					))}
					<HudButton
						label={snap.paused ? "▶" : "⏸"}
						meta={snap.paused ? "resume" : "pause"}
						active={snap.paused}
						variant={snap.paused ? "secondary" : "primary"}
						onPress={togglePause}
					/>
				</View>
			</View>
		</View>
	);
}
