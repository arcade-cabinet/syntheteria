import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { WORLD_HALF } from "../../ecs/terrain";
import { Identity, WorldPosition } from "../../ecs/traits";
import { buildings, units } from "../../ecs/world";

export function Minimap() {
	// We subscribe to game state to force re-renders for the minimap every tick
	useSyncExternalStore(subscribe, getSnapshot);

	const sz = 120;
	const half = sz / 2;
	const scale = (sz * 0.45) / WORLD_HALF;

	return (
		<View
			className="absolute bottom-6 right-4 bg-black/80 border border-emerald-500/40 rounded-lg overflow-hidden"
			style={{ width: sz, height: sz }}
		>
			{/* Grid lines decoration */}
			<View className="absolute top-1/2 left-0 w-full h-[1px] bg-emerald-500/20" />
			<View className="absolute left-1/2 top-0 w-[1px] h-full bg-emerald-500/20" />

			{Array.from(buildings).map((entity) => {
				const wp = entity.get(WorldPosition);
				const identity = entity.get(Identity);
				if (!wp || !identity) return null;
				const x = half + wp.x * scale;
				const y = half + wp.z * scale;
				return (
					<View
						key={identity.id}
						className="absolute w-1.5 h-1.5 bg-amber-500 rounded-sm shadow shadow-amber-500/50"
						style={{ left: x - 2, top: y - 2 }}
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
						className={`absolute w-1 h-1 rounded-full ${isEnemy ? "bg-red-500 shadow-red-500/50" : "bg-emerald-400 shadow-emerald-400/50"} shadow`}
						style={{ left: x - 1.5, top: y - 1.5 }}
					/>
				);
			})}
		</View>
	);
}
