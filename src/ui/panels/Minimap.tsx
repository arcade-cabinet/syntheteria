/**
 * Minimap — Shows real game state: territory colors, unit dots, structure icons.
 *
 * Reads from:
 *   - ECS world queries (units, buildings) for entity positions
 *   - Territory system for faction-colored territory cells
 *   - Exploration system for fog of war (undiscovered = dark)
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { Identity, WorldPosition } from "../../ecs/traits";
import { buildings, units } from "../../ecs/world";
import {
	getAllCellOwnership,
	type TerritoryCell,
} from "../../systems/territorySystem";
import {
	getWorldHalfExtents,
	gridToWorld,
} from "../../world/sectorCoordinates";
import { MapIcon, RadarIcon } from "../icons";

/** Faction colors for territory on minimap */
const FACTION_COLORS: Record<string, string> = {
	player: "rgba(111, 243, 200, 0.25)",
	rogue: "rgba(246, 197, 106, 0.2)",
	cultist: "rgba(212, 160, 255, 0.2)",
	feral: "rgba(255, 143, 143, 0.2)",
};

export function Minimap() {
	useSyncExternalStore(subscribe, getSnapshot);
	const { width } = useWindowDimensions();

	const { x: worldHalfX, z: worldHalfZ } = getWorldHalfExtents();

	if (worldHalfX <= 0 && worldHalfZ <= 0) {
		return null;
	}

	const size = width < 768 ? 112 : 154;
	const half = size / 2;
	const scale = (size * 0.45) / Math.max(worldHalfX, worldHalfZ, 1);

	// Get territory cells for rendering
	const ownership = getAllCellOwnership();
	const territoryCells: Array<{ x: number; y: number; color: string }> = [];

	for (const [, cell] of ownership) {
		const worldPos = gridToWorld(cell.q, cell.r);
		const x = half + worldPos.x * scale;
		const y = half + worldPos.z * scale;
		const color = FACTION_COLORS[cell.owner] ?? "rgba(128,128,128,0.1)";
		territoryCells.push({ x, y, color });
	}

	return (
		<View className="absolute bottom-4 md:bottom-6 right-3 md:right-4 pointer-events-auto">
			<View className="w-[140px] md:w-[172px] rounded-[20px] md:rounded-[24px] border border-white/10 bg-[#081017]/90 p-2 md:p-3 shadow-2xl">
				<View className="flex-row items-center justify-between">
					<View>
						<Text className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-white/45">
							Sector Scan
						</Text>
						<Text className="mt-0.5 md:mt-1 font-mono text-xs md:text-sm uppercase tracking-[0.14em] text-[#defef3]">
							Command Grid
						</Text>
					</View>
					<View className="h-8 w-8 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
						<RadarIcon width={18} height={18} color="#89d9ff" />
					</View>
				</View>

				<View
					className="mt-3 overflow-hidden rounded-[20px] border border-[#89d9ff]/18 bg-[#04090d]"
					style={{ width: size, height: size }}
					accessibilityLabel="Minimap showing territory, units, and structures"
				>
					<View className="absolute inset-0 bg-[#0e1820]/70" />

					{/* Grid crosshairs */}
					<View className="absolute top-1/2 left-0 h-[1px] w-full bg-[#89d9ff]/18" />
					<View className="absolute left-1/2 top-0 h-full w-[1px] bg-[#89d9ff]/18" />

					{/* Territory cells — faction-colored squares */}
					{territoryCells.map((cell, i) => (
						<View
							key={`t_${i}`}
							style={{
								position: "absolute",
								left: cell.x - 2,
								top: cell.y - 2,
								width: 4,
								height: 4,
								backgroundColor: cell.color,
							}}
						/>
					))}

					{/* Buildings — amber squares */}
					{Array.from(buildings).map((entity) => {
						const wp = entity.get(WorldPosition);
						const identity = entity.get(Identity);
						if (!wp || !identity) return null;
						const x = half + wp.x * scale;
						const y = half + wp.z * scale;
						const isPlayer = identity.faction === "player";
						return (
							<View
								key={identity.id}
								className="absolute h-2.5 w-2.5 rounded-[4px]"
								style={{
									left: x - 3,
									top: y - 3,
									borderWidth: 1,
									borderColor: isPlayer
										? "rgba(246, 197, 106, 0.7)"
										: "rgba(255, 143, 143, 0.5)",
									backgroundColor: isPlayer ? "#f6c56a" : "#ff8f8f",
								}}
							/>
						);
					})}

					{/* Units — colored dots */}
					{Array.from(units).map((entity) => {
						const wp = entity.get(WorldPosition);
						const identity = entity.get(Identity);
						if (!wp || !identity) return null;
						const isEnemy = identity.faction !== "player";
						const x = half + wp.x * scale;
						const y = half + wp.z * scale;
						return (
							<View
								key={identity.id}
								className="absolute h-2 w-2 rounded-full"
								style={{
									left: x - 2.5,
									top: y - 2.5,
									backgroundColor: isEnemy ? "#ff8f8f" : "#6ff3c8",
								}}
							/>
						);
					})}

					{/* Legend */}
					<View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-full border border-white/8 bg-black/40 px-2 py-1">
						<MapIcon width={12} height={12} color="#89d9ff" />
						<Text className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
							Territory
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
