import { useSyncExternalStore } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { Identity, WorldPosition } from "../../ecs/traits";
import { buildings, units } from "../../ecs/world";
import { MapIcon, RadarIcon } from "../icons";
import { getWorldHalfExtents } from "../../world/sectorCoordinates";

export function Minimap() {
	useSyncExternalStore(subscribe, getSnapshot);
	const { width } = useWindowDimensions();

	const size = width < 768 ? 112 : 154;
	const half = size / 2;
	const { x: worldHalfX, z: worldHalfZ } = getWorldHalfExtents();
	const scale = (size * 0.45) / Math.max(worldHalfX, worldHalfZ, 1);

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
				>
					<View className="absolute inset-0 bg-[#0e1820]/70" />
					<View className="absolute top-1/2 left-0 h-[1px] w-full bg-[#89d9ff]/18" />
					<View className="absolute left-1/2 top-0 h-full w-[1px] bg-[#89d9ff]/18" />

					{Array.from(buildings).map((entity) => {
						const wp = entity.get(WorldPosition);
						const identity = entity.get(Identity);
						if (!wp || !identity) return null;
						const x = half + wp.x * scale;
						const y = half + wp.z * scale;
						return (
							<View
								key={identity.id}
								className="absolute h-2.5 w-2.5 rounded-[4px] border border-[#f6c56a]/70 bg-[#f6c56a]"
								style={{ left: x - 3, top: y - 3 }}
							/>
						);
					})}

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
								className={`absolute h-2 w-2 rounded-full ${isEnemy ? "bg-[#ff8f8f]" : "bg-[#6ff3c8]"}`}
								style={{ left: x - 2.5, top: y - 2.5 }}
							/>
						);
					})}

					<View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-full border border-white/8 bg-black/40 px-2 py-1">
						<MapIcon width={12} height={12} color="#89d9ff" />
						<Text className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
							Network
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
