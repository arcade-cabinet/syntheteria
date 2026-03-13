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
	"Encoding sector lattice",
	"Anchoring relay spines",
	"Seeding structural districts",
	"Mapping storm pressure corridors",
	"Committing to distributed archive",
] as const;

/**
 * Storm-translucent loading overlay.
 *
 * When composited over the live 3D title scene, the reduced backdrop
 * opacity (50% instead of 82%) lets the storm clouds and lightning
 * bleed through — keeping the diegetic atmosphere alive during world
 * generation rather than cutting to a dead black screen.
 */
export function LoadingOverlay({ label }: { label: string }) {
	const [stageIndex, setStageIndex] = useState(0);
	const sweep = useSharedValue(0);
	const pulseGlow = useSharedValue(0.5);

	useEffect(() => {
		sweep.value = withRepeat(
			withSequence(
				withTiming(1, { duration: 1400 }),
				withTiming(0, { duration: 200 }),
			),
			-1,
			false,
		);

		// Subtle cyan glow pulse on the panel border
		pulseGlow.value = withRepeat(
			withSequence(
				withTiming(0.8, { duration: 2000 }),
				withTiming(0.4, { duration: 2000 }),
			),
			-1,
			true,
		);

		const interval = setInterval(() => {
			setStageIndex((prev) =>
				prev < LOADING_STAGES.length - 1 ? prev + 1 : prev,
			);
		}, 2200);

		return () => clearInterval(interval);
	}, [sweep, pulseGlow]);

	const sweepStyle = useAnimatedStyle(() => ({
		width: `${sweep.value * 100}%`,
		opacity: 0.6 + sweep.value * 0.4,
	}));

	const panelGlowStyle = useAnimatedStyle(() => ({
		borderColor: `rgba(139, 230, 255, ${pulseGlow.value * 0.3})`,
	}));

	return (
		<View className="absolute inset-0 items-center justify-center bg-[#02050a]/50 px-4 md:px-6">
			<Animated.View
				style={panelGlowStyle}
				className="w-full max-w-[560px] rounded-[24px] md:rounded-[28px] border bg-[#07111b]/92 px-4 py-5 md:px-6 md:py-6 shadow-2xl"
			>
				<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
					Campaign Initialization
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

				{/* Stage progress dots */}
				<View className="mt-4 flex-row items-center justify-center gap-2">
					{LOADING_STAGES.map((_, i) => (
						<View
							key={LOADING_STAGES[i]}
							className={`h-1.5 w-1.5 rounded-full ${
								i <= stageIndex ? "bg-[#8be6ff]" : "bg-white/12"
							}`}
						/>
					))}
				</View>
			</Animated.View>
		</View>
	);
}
