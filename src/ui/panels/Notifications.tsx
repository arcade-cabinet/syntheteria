import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { AlertIcon, MapIcon } from "../icons";

export function Notifications() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<View className="absolute right-safe top-36 mr-4 items-end gap-3 pointer-events-none">
			{snap.combatEvents.slice(0, 3).map((event, index) => (
				<View
					key={index}
					className="min-w-[280px] rounded-[20px] border border-[#ff8f8f]/25 bg-[#190d10]/90 px-4 py-3 shadow-2xl"
				>
					<View className="flex-row items-center gap-2">
						<AlertIcon width={16} height={16} color="#ff8f8f" />
						<Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9f9f]">
							Combat Alert
						</Text>
					</View>
					<Text className="mt-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[#ffe2e2]">
						{event.targetDestroyed
							? `${event.targetId} destroyed`
							: `${event.targetId} hit on ${event.componentDamaged}`}
					</Text>
				</View>
			))}

			{snap.mergeEvents.length > 0 && (
				<View className="rounded-[24px] border border-[#6ff3c8]/28 bg-[#071117]/92 px-5 py-4 shadow-2xl">
					<View className="flex-row items-center gap-2">
						<MapIcon width={18} height={18} color="#6ff3c8" />
						<Text className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7ee7cb]">
							Topology Event
						</Text>
					</View>
					<Text className="mt-2 font-mono text-base uppercase tracking-[0.14em] text-[#dffef2]">
						Map Fragments Linked
					</Text>
					<Text className="mt-1 font-mono text-[11px] text-white/50">
						Disconnected reconnaissance threads now share one world frame.
					</Text>
				</View>
			)}
		</View>
	);
}
