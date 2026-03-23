import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import Animated, {
	Easing,
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
 * Full-screen diegetic loading overlay.
 *
 * Inspired by the prompt designs: centered spinner ring, bold stage text,
 * gradient progress bar, and staged sub-messages. Composites over the
 * live storm scene with reduced backdrop opacity so lightning and cloud
 * churn remain visible underneath.
 */
export function LoadingOverlay({ label }: { label: string }) {
	const [stageIndex, setStageIndex] = useState(0);

	// Spinner ring rotation
	const spinRotation = useSharedValue(0);
	// Progress bar sweep
	const progressWidth = useSharedValue(0);
	// Pulse glow
	const pulseGlow = useSharedValue(0.4);

	useEffect(() => {
		// Continuous spinner
		spinRotation.value = withRepeat(
			withTiming(360, { duration: 2000, easing: Easing.linear }),
			-1,
			false,
		);

		// Progress bar: grows in steps matching stage progression
		progressWidth.value = withTiming(20, { duration: 800 });

		// Glow pulse
		pulseGlow.value = withRepeat(
			withSequence(
				withTiming(0.8, { duration: 1600 }),
				withTiming(0.4, { duration: 1600 }),
			),
			-1,
			true,
		);

		const interval = setInterval(() => {
			setStageIndex((prev) => {
				const next = Math.min(prev + 1, LOADING_STAGES.length - 1);
				// Step progress bar forward
				progressWidth.value = withTiming(
					((next + 1) / LOADING_STAGES.length) * 100,
					{ duration: 600 },
				);
				return next;
			});
		}, 2200);

		return () => clearInterval(interval);
	}, [spinRotation, progressWidth, pulseGlow]);

	const spinStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${spinRotation.value}deg` }],
	}));

	const progressStyle = useAnimatedStyle(() => ({
		width: `${progressWidth.value}%`,
	}));

	const glowStyle = useAnimatedStyle(() => ({
		opacity: pulseGlow.value,
	}));

	return (
		<View className="absolute inset-0 items-center justify-center bg-[#020307]/55">
			<View className="items-center" style={{ maxWidth: 480, width: "100%" }}>
				{/* Spinner ring */}
				<Animated.View
					style={[
						spinStyle,
						{
							width: 80,
							height: 80,
							borderRadius: 40,
							borderWidth: 3,
							borderColor: "rgba(139, 230, 255, 0.2)",
							borderTopColor: "#8be6ff",
						},
					]}
				/>

				{/* Main label */}
				<Text
					className="mt-8 font-mono text-center"
					style={{
						fontSize: Platform.select({ web: 28, default: 22 }),
						letterSpacing: 4,
						color: "#8be6ff",
						textTransform: "uppercase",
						textShadowColor: "rgba(139, 230, 255, 0.5)",
						textShadowOffset: { width: 0, height: 0 },
						textShadowRadius: 16,
					}}
				>
					{label}
				</Text>

				{/* Stage sub-text */}
				<Animated.View style={glowStyle}>
					<Text
						className="mt-3 font-mono text-center"
						style={{
							fontSize: 11,
							letterSpacing: 3,
							color: "rgba(139, 230, 255, 0.55)",
							textTransform: "uppercase",
						}}
					>
						{LOADING_STAGES[stageIndex]}
					</Text>
				</Animated.View>

				{/* Progress bar */}
				<View
					className="mt-6 overflow-hidden rounded-full"
					style={{
						width: "80%",
						height: 6,
						backgroundColor: "rgba(139, 230, 255, 0.08)",
						borderWidth: 1,
						borderColor: "rgba(139, 230, 255, 0.12)",
						borderRadius: 3,
					}}
				>
					<Animated.View
						style={[
							progressStyle,
							{
								height: "100%",
								borderRadius: 3,
							},
						]}
						className="bg-[#8be6ff]/70"
					/>
				</View>

				{/* Stage dots */}
				<View className="mt-4 flex-row items-center justify-center gap-2">
					{LOADING_STAGES.map((stage, i) => (
						<View
							key={stage}
							style={{
								width: 5,
								height: 5,
								borderRadius: 2.5,
								backgroundColor:
									i <= stageIndex ? "#8be6ff" : "rgba(255, 255, 255, 0.1)",
							}}
						/>
					))}
				</View>
			</View>
		</View>
	);
}
