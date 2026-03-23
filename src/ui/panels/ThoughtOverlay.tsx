import React, { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { dismissThought } from "../../systems/narrative";
import { DroneIcon } from "../icons";

export function ThoughtOverlay() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const thought = snap.activeThought;

	if (!thought) return null;

	return (
		<Animated.View
			entering={FadeIn.duration(700)}
			exiting={FadeOut.duration(400)}
			className="absolute left-0 top-28 w-full items-center pointer-events-none"
		>
			<Pressable
				onPress={dismissThought}
				className="pointer-events-auto max-w-[78%] overflow-hidden rounded-[26px] border border-[#6ff3c8]/30 bg-[#071117]/94 px-6 py-5 shadow-2xl"
			>
				<View className="absolute inset-x-0 top-0 h-16 bg-[#6ff3c8]/10" />
				<View className="flex-row items-center gap-2">
					<DroneIcon width={18} height={18} color="#7ee7cb" />
					<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#7ee7cb]">
						Machine Thought
					</Text>
				</View>
				<Text className="mt-3 font-mono text-lg leading-7 tracking-[0.04em] text-[#e3fff5]">
					{thought.text}
				</Text>
				<Text className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
					Tap to dismiss
				</Text>
			</Pressable>
		</Animated.View>
	);
}
