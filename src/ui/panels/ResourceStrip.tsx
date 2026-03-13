import { useSyncExternalStore } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import { buildings } from "../../ecs/world";
import { openCityKitLab } from "../../world/cityTransition";
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

/**
 * ResourceStrip — compact single-row resource bar for mobile viewports.
 *
 * Replaces the multi-row TopBar on phones. Shows icons + numbers only,
 * ~36px tall, semi-transparent background. Labels visible on long-press.
 *
 * On tablet/desktop, the full TopBar is shown instead.
 *
 * Design reference: MOBILE_4X_VIEWPORT_DESIGN.md §5
 */

const PHONE_BREAKPOINT = 768;

function CompactStat({
	value,
	icon,
	tone = "mint",
}: {
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
		<View className="flex-row items-center gap-1 px-1.5">
			<View className="h-3.5 w-3.5 items-center justify-center">{icon}</View>
			<Text className={`font-mono text-[11px] tracking-[0.08em] ${toneText}`}>
				{value}
			</Text>
		</View>
	);
}

function MobileResourceStrip() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<View className="absolute left-0 top-0 w-full pt-safe pointer-events-none">
			<View className="pointer-events-auto mx-1 mt-1 flex-row items-center justify-between rounded-xl bg-[#071117]/70 px-1 py-1">
				<View className="flex-row items-center">
					<CompactStat
						value={snap.unitCount}
						icon={<DroneIcon width={14} height={14} color="#7ee7cb" />}
					/>
					<CompactStat
						value={snap.resources.scrapMetal}
						icon={<ShardIcon width={14} height={14} color="#7ee7cb" />}
					/>
					<CompactStat
						value={snap.resources.eWaste}
						icon={<MapIcon width={14} height={14} color="#89d9ff" />}
					/>
					<CompactStat
						value={snap.resources.intactComponents}
						icon={<BoltIcon width={14} height={14} color="#f6c56a" />}
						tone="amber"
					/>
					<CompactStat
						value={`${(snap.power.stormIntensity * 100).toFixed(0)}%`}
						icon={<StormIcon width={14} height={14} color="#f6c56a" />}
						tone="amber"
					/>
				</View>

				<View className="flex-row items-center gap-1">
					<Text className="font-mono text-[9px] tracking-wider text-[#b088d8]/80">
						{`D${snap.weather.dayNumber}`}
					</Text>
					<Pressable
						onPress={togglePause}
						className="h-7 w-7 items-center justify-center rounded-lg bg-white/8"
					>
						{snap.paused ? (
							<PlayIcon width={12} height={12} color="#89d9ff" />
						) : (
							<PauseIcon width={12} height={12} color="#7ee7cb" />
						)}
					</Pressable>
				</View>
			</View>
		</View>
	);
}

export function ResponsiveTopBar() {
	const { width } = useWindowDimensions();
	const isPhone = width < PHONE_BREAKPOINT;

	if (isPhone) {
		return <MobileResourceStrip />;
	}

	// On tablet/desktop, delegate to the full TopBar
	// Import is deferred to avoid circular deps
	const { TopBar } = require("./TopBar");
	return <TopBar />;
}
