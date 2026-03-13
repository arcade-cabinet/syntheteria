import React, { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { dismissThought } from "../../systems/narrative";

export function ThoughtOverlay() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const thought = snap.activeThought;

	if (!thought) return null;

	return (
		<Animated.View
			entering={FadeIn.duration(700)}
			exiting={FadeOut.duration(400)}
			className="absolute inset-0 items-center justify-center pointer-events-none"
		>
			<Pressable
				onPress={dismissThought}
				className="pointer-events-auto mx-6 max-w-[520px] overflow-hidden rounded-[26px] border border-[#6ff3c8]/22 bg-[#071117]/92 px-6 py-5 shadow-2xl"
			>
				<View className="absolute inset-x-0 top-0 h-12 bg-[#6ff3c8]/6" />
				<Text className="font-mono text-lg leading-7 tracking-[0.04em] text-[#e3fff5]">
					{thought.text}
				</Text>
				<Text className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
					Tap to dismiss
				</Text>
			</Pressable>
		</Animated.View>
	);
}
