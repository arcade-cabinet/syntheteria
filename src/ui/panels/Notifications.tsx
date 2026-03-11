import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";

export function Notifications() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<View className="absolute top-32 right-safe mr-4 items-end pointer-events-none">
			{/* Combat notifications */}
			{snap.combatEvents.slice(0, 3).map((e, i) => (
				<View
					key={i}
					className="bg-red-950/80 border border-red-500/50 rounded p-2 mb-2 min-w-[200px]"
				>
					<Text className="font-mono text-xs text-red-400">
						{e.targetDestroyed
							? `[CRITICAL] ${e.targetId} DESTROYED`
							: `[WARN] ${e.targetId}: ${e.componentDamaged} damaged`}
					</Text>
				</View>
			))}

			{/* Fragment merge notification */}
			{snap.mergeEvents.length > 0 && (
				<View className="absolute top-1/2 right-1/2 translate-x-1/2 translate-y-1/2 bg-emerald-950/90 border-2 border-emerald-400 rounded-lg p-4 shadow-lg shadow-emerald-500/20">
					<Text className="font-mono text-lg text-emerald-400 font-bold tracking-widest text-center">
						SYS: MAP FRAGMENTS MERGED
					</Text>
				</View>
			)}
		</View>
	);
}
