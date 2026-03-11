import { Pressable, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

interface HudButtonProps {
	label: string;
	onPress: () => void;
	active?: boolean;
	disabled?: boolean;
	className?: string;
	variant?: "primary" | "secondary" | "danger";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HudButton({
	label,
	onPress,
	active = false,
	disabled = false,
	className = "",
	variant = "primary",
}: HudButtonProps) {
	const scale = useSharedValue(1);

	const handlePressIn = () => {
		scale.value = withSpring(0.95);
	};

	const handlePressOut = () => {
		scale.value = withSpring(1);
	};

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: scale.value }],
		};
	});

	const getBorderColor = () => {
		if (disabled) return "border-gray-600/50";
		if (variant === "danger")
			return active ? "border-red-500" : "border-red-500/50";
		if (variant === "secondary")
			return active ? "border-cyan-400" : "border-cyan-400/50";
		return active ? "border-emerald-400" : "border-emerald-400/50";
	};

	const getBgColor = () => {
		if (disabled) return "bg-gray-800/80";
		if (variant === "danger") return active ? "bg-red-500/20" : "bg-black/60";
		if (variant === "secondary")
			return active ? "bg-cyan-400/20" : "bg-black/60";
		return active ? "bg-emerald-400/20" : "bg-black/60";
	};

	const getTextColor = () => {
		if (disabled) return "text-gray-500";
		if (variant === "danger") return "text-red-400";
		if (variant === "secondary") return "text-cyan-300";
		return "text-emerald-400";
	};

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			disabled={disabled}
			className={`p-3 border-2 ${getBorderColor()} ${getBgColor()} items-center justify-center ${className}`}
			style={animatedStyle}
		>
			<Text
				className={`font-mono text-xs tracking-widest uppercase ${getTextColor()}`}
			>
				{label}
			</Text>

			{/* Decorative corners */}
			<View
				className={`absolute top-0 left-0 w-1 h-1 border-t-2 border-l-2 ${getBorderColor()}`}
			/>
			<View
				className={`absolute top-0 right-0 w-1 h-1 border-t-2 border-r-2 ${getBorderColor()}`}
			/>
			<View
				className={`absolute bottom-0 left-0 w-1 h-1 border-b-2 border-l-2 ${getBorderColor()}`}
			/>
			<View
				className={`absolute bottom-0 right-0 w-1 h-1 border-b-2 border-r-2 ${getBorderColor()}`}
			/>
		</AnimatedPressable>
	);
}
