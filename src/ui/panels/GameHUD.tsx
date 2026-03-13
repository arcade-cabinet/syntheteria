/**
 * GameHUD — Clean diegetic HUD inspired by the prompt designs.
 *
 * Displays resource panels with colored borders:
 *   - Energy (cyan) with bolt icon
 *   - Materials (amber) with count
 *   - Units (mint) with drone count
 *   - Storm Pressure (dynamic red/amber/mint) with intensity label
 *
 * Plus simulation speed controls on the right.
 *
 * All panels use the game's signal language:
 *   cyan = intelligence/signal
 *   mint = operational/healthy
 *   amber = fabrication/power/utility
 *   red = danger/hostile
 */

import { useSyncExternalStore } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import {
	endPlayerTurn,
	getTurnState,
	subscribeTurnState,
} from "../../systems/turnSystem";
import {
	BoltIcon,
	DroneIcon,
	PauseIcon,
	PlayIcon,
	ShardIcon,
	StormIcon,
} from "../icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
	if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
	if (n >= 1000) return n.toLocaleString();
	return String(n);
}

function stormLabel(intensity: number): {
	label: string;
	tone: "mint" | "amber" | "crimson";
} {
	if (intensity < 0.3) return { label: "CALM", tone: "mint" };
	if (intensity < 0.6) return { label: "MODERATE", tone: "amber" };
	if (intensity < 0.85) return { label: "HIGH", tone: "crimson" };
	return { label: "CRITICAL", tone: "crimson" };
}

// ─── Resource Panel ──────────────────────────────────────────────────────────

function ResourcePanel({
	label,
	value,
	icon,
	borderColor,
	textColor,
}: {
	label: string;
	value: string | number;
	icon?: React.ReactNode;
	borderColor: string;
	textColor: string;
}) {
	return (
		<View
			style={{
				borderWidth: 1,
				borderColor,
				borderRadius: 6,
				backgroundColor: "rgba(7, 17, 23, 0.75)",
				paddingHorizontal: 12,
				paddingVertical: 8,
				// Subtle backdrop blur on web
				...(Platform.OS === "web"
					? ({ backdropFilter: "blur(8px)" } as Record<string, string>)
					: {}),
			}}
		>
			<Text
				className="font-mono"
				style={{
					fontSize: 9,
					letterSpacing: 2,
					color: textColor,
					textTransform: "uppercase",
					opacity: 0.8,
				}}
			>
				{label}
			</Text>
			<View className="mt-1 flex-row items-center gap-1.5">
				{icon}
				<Text
					className="font-mono"
					style={{
						fontSize: 18,
						fontWeight: "700",
						color: textColor,
						letterSpacing: 1,
					}}
				>
					{typeof value === "number" ? formatNumber(value) : value}
				</Text>
			</View>
		</View>
	);
}

// ─── Speed Controls ──────────────────────────────────────────────────────────

function _SpeedControls({
	paused,
	gameSpeed,
	dayNumber,
}: {
	paused: boolean;
	gameSpeed: number;
	dayNumber: number;
}) {
	const speeds = [
		{ label: "1×", value: 1 },
		{ label: "1.5×", value: 1.5 },
		{ label: "3×", value: 3 },
	];

	return (
		<View
			style={{
				borderWidth: 1,
				borderColor: "rgba(139, 230, 255, 0.2)",
				borderRadius: 6,
				backgroundColor: "rgba(7, 17, 23, 0.75)",
				paddingHorizontal: 8,
				paddingVertical: 6,
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
				...(Platform.OS === "web"
					? ({ backdropFilter: "blur(8px)" } as Record<string, string>)
					: {}),
			}}
		>
			<Text
				className="font-mono"
				style={{
					fontSize: 10,
					letterSpacing: 1,
					color: "rgba(176, 136, 216, 0.7)",
				}}
			>
				D{dayNumber}
			</Text>

			<Pressable
				onPress={togglePause}
				style={{
					width: 30,
					height: 30,
					borderRadius: 6,
					backgroundColor: paused
						? "rgba(139, 230, 255, 0.15)"
						: "rgba(255, 255, 255, 0.06)",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{paused ? (
					<PlayIcon width={14} height={14} color="#8be6ff" />
				) : (
					<PauseIcon width={14} height={14} color="#7ee7cb" />
				)}
			</Pressable>

			{speeds.map((s) => (
				<Pressable
					key={s.label}
					onPress={() => setGameSpeed(s.value)}
					style={{
						paddingHorizontal: 6,
						paddingVertical: 4,
						borderRadius: 4,
						backgroundColor:
							Math.abs(gameSpeed - s.value) < 0.01
								? "rgba(139, 230, 255, 0.18)"
								: "transparent",
					}}
				>
					<Text
						className="font-mono"
						style={{
							fontSize: 10,
							letterSpacing: 1,
							color:
								Math.abs(gameSpeed - s.value) < 0.01
									? "#8be6ff"
									: "rgba(255, 255, 255, 0.4)",
						}}
					>
						{s.label}
					</Text>
				</Pressable>
			))}
		</View>
	);
}

// ─── Main HUD ────────────────────────────────────────────────────────────────

export function GameHUD() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const storm = stormLabel(snap.power.stormIntensity);

	const stormBorderColor =
		storm.tone === "crimson"
			? "rgba(255, 80, 80, 0.4)"
			: storm.tone === "amber"
				? "rgba(251, 191, 36, 0.4)"
				: "rgba(126, 231, 203, 0.3)";

	const stormTextColor =
		storm.tone === "crimson"
			? "#ffd7d7"
			: storm.tone === "amber"
				? "#ffe9b0"
				: "#d9fff3";

	return (
		<View className="absolute left-0 top-0 right-0 pointer-events-none pt-safe">
			<View
				className="pointer-events-auto mx-3 mt-2 flex-row items-start justify-between"
				style={{ gap: 8 }}
			>
				{/* Left: resource panels */}
				<View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
					<ResourcePanel
						label="Energy"
						value={snap.power.totalGeneration}
						icon={<BoltIcon width={16} height={16} color="#8be6ff" />}
						borderColor="rgba(139, 230, 255, 0.3)"
						textColor="#d0f4ff"
					/>
					<ResourcePanel
						label="Materials"
						value={snap.resources.scrapMetal}
						icon={<ShardIcon width={16} height={16} color="#f6c56a" />}
						borderColor="rgba(251, 191, 36, 0.3)"
						textColor="#ffe9b0"
					/>
					<ResourcePanel
						label="Units"
						value={snap.unitCount}
						icon={<DroneIcon width={16} height={16} color="#7ee7cb" />}
						borderColor="rgba(126, 231, 203, 0.3)"
						textColor="#d9fff3"
					/>
				</View>

				{/* Right: storm + turn controls */}
				<View className="items-end" style={{ gap: 6 }}>
					<View className="flex-row" style={{ gap: 6 }}>
						<ResourcePanel
							label="Storm Pressure"
							value={storm.label}
							icon={<StormIcon width={16} height={16} color={stormTextColor} />}
							borderColor={stormBorderColor}
							textColor={stormTextColor}
						/>
						<ResourcePanel
							label="Turn"
							value={`${snap.weather.dayNumber}`}
							borderColor="rgba(176, 136, 216, 0.3)"
							textColor="#d4b0ff"
						/>
					</View>
					<Pressable
						onPress={endPlayerTurn}
						style={{
							borderWidth: 1.5,
							borderColor: "rgba(139, 230, 255, 0.5)",
							borderRadius: 6,
							backgroundColor: "rgba(139, 230, 255, 0.12)",
							paddingHorizontal: 16,
							paddingVertical: 10,
							alignItems: "center",
							...(Platform.OS === "web"
								? ({ backdropFilter: "blur(8px)" } as Record<string, string>)
								: {}),
						}}
					>
						<Text
							className="font-mono"
							style={{
								fontSize: 11,
								letterSpacing: 3,
								color: "#8be6ff",
								fontWeight: "700",
								textTransform: "uppercase",
							}}
						>
							End Turn
						</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}
