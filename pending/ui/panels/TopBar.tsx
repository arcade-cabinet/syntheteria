import type React from "react";
import { useSyncExternalStore } from "react";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import { openCityKitLab } from "../../world/cityTransition";
import { HudButton } from "../components/HudButton";
import { useResourcePool } from "../hooks/useResourcePool";
import { BoltIcon, ShardIcon, StormIcon } from "../icons";

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
		<div className="flex flex-row items-center gap-1.5 px-2">
			<div className="h-3.5 w-3.5 flex items-center justify-center">{icon}</div>
			<span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/50">
				{label}
			</span>
			<span className={`font-mono text-[12px] tracking-[0.08em] ${toneText}`}>
				{value}
			</span>
		</div>
	);
}

/**
 * TopBar — minimal telemetry strip for desktop/tablet.
 *
 * Design philosophy: the HUD should frame the experience, not compete with it.
 * Resources, day counter, storm %, and sim controls in a single thin strip.
 * No headers. No panels. The radial menu and speech bubbles handle everything else.
 *
 * Resource values are read via useResourcePool() (Koota entity, reactive) rather
 * than the full gameState snapshot, so resource mutations trigger targeted re-renders.
 */
export function TopBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const resources = useResourcePool();

	return (
		<div className="absolute left-0 top-0 w-full pt-safe pointer-events-none">
			<div className="pointer-events-auto mx-3 md:mx-4 mt-2 md:mt-3 flex flex-row items-center justify-between rounded-2xl bg-[#071117]/72 px-3 py-2 shadow-lg">
				{/* Left: resource readouts */}
				<div className="flex flex-row items-center gap-2">
					<StatChip
						label={`D${snap.weather.dayNumber}`}
						value={snap.weather.phase.toUpperCase()}
						icon={<StormIcon width={14} height={14} color="#b088d8" />}
						tone="amber"
					/>
					<StatChip
						label="Scrap"
						value={resources.scrapMetal}
						icon={<ShardIcon width={14} height={14} color="#7ee7cb" />}
					/>
					<StatChip
						label="Parts"
						value={resources.intactComponents}
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
				</div>

				{/* Right: sim speed + pause */}
				<div className="flex flex-row items-center gap-1.5">
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
				</div>
			</div>
		</div>
	);
}
