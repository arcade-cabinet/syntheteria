import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

const LOADING_STAGES = [
	"Encoding terrain lattice",
	"Anchoring relay points",
	"Seeding city infrastructure",
	"Mapping storm corridors",
	"Committing to distributed archive",
] as const;

export function LoadingOverlay({ label }: { label: string }) {
	const [stageIndex, setStageIndex] = useState(0);
	const sweep = useSharedValue(0);

	useEffect(() => {
		sweep.value = withRepeat(
			withSequence(
				withTiming(1, { duration: 1400 }),
				withTiming(0, { duration: 200 }),
			),
			-1,
			false,
		);

		const interval = setInterval(() => {
			setStageIndex((prev) =>
				prev < LOADING_STAGES.length - 1 ? prev + 1 : prev,
			);
		}, 2200);

		return () => clearInterval(interval);
	}, [sweep]);

	const sweepStyle = useAnimatedStyle(() => ({
		width: `${sweep.value * 100}%`,
		opacity: 0.6 + sweep.value * 0.4,
	}));

	return (
		<View className="absolute inset-0 items-center justify-center bg-[#02050a]/82 px-4 md:px-6">
			<View className="w-full max-w-[560px] rounded-[24px] md:rounded-[28px] border border-[#8be6ff]/20 bg-[#07111b]/94 px-4 py-5 md:px-6 md:py-6 shadow-2xl">
				<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
					World Generation
				</Text>
				<Text className="mt-3 font-mono text-[16px] md:text-[20px] uppercase tracking-[0.12em] text-[#edfaff]">
					{label}
				</Text>
				<Text className="mt-3 font-mono text-[12px] leading-5 text-white/44">
					{LOADING_STAGES[stageIndex]}
				</Text>
				<View className="mt-5 h-2 overflow-hidden rounded-full border border-[#8be6ff]/18 bg-[#061018]">
					<Animated.View
						style={sweepStyle}
						className="h-full rounded-full bg-[#7fe5ff]"
					/>
				</View>
			</View>
		</View>
	);
}
