import type React from "react";
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
	variant?: "primary" | "secondary" | "utility" | "danger";
	icon?: React.ReactNode;
	meta?: string;
	testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_TONES = {
	primary: {
		border: "border-[#6ff3c8]/30",
		borderActive: "border-[#6ff3c8]/70",
		bg: "bg-[#071117]/92",
		bgActive: "bg-[#102a27]",
		text: "text-[#d8fff1]",
		meta: "text-[#6bd9bf]",
		accent: "bg-[#6ff3c8]",
	},
	secondary: {
		border: "border-[#89d9ff]/28",
		borderActive: "border-[#89d9ff]/65",
		bg: "bg-[#07111a]/92",
		bgActive: "bg-[#0c2533]",
		text: "text-[#dff6ff]",
		meta: "text-[#89d9ff]",
		accent: "bg-[#89d9ff]",
	},
	utility: {
		border: "border-[#f6c56a]/28",
		borderActive: "border-[#f6c56a]/65",
		bg: "bg-[#171107]/92",
		bgActive: "bg-[#332a0c]",
		text: "text-[#fff4de]",
		meta: "text-[#f6c56a]",
		accent: "bg-[#f6c56a]",
	},
	danger: {
		border: "border-[#ff8f7a]/30",
		borderActive: "border-[#ff8f7a]/70",
		bg: "bg-[#160a0b]/92",
		bgActive: "bg-[#351012]",
		text: "text-[#ffe3de]",
		meta: "text-[#ff9f8e]",
		accent: "bg-[#ff8f7a]",
	},
} as const;

export function HudButton({
	label,
	onPress,
	active = false,
	disabled = false,
	className = "",
	variant = "primary",
	icon,
	meta,
	testID,
}: HudButtonProps) {
	const scale = useSharedValue(1);
	const tone = BUTTON_TONES[variant];

	const handlePressIn = () => {
		scale.value = withSpring(0.97, { damping: 18, stiffness: 280 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 18, stiffness: 220 });
	};

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const borderClass = disabled
		? "border-white/10"
		: active
			? tone.borderActive
			: tone.border;
	const bgClass = disabled
		? "bg-[#11161b]/70"
		: active
			? tone.bgActive
			: tone.bg;
	const textClass = disabled ? "text-white/25" : tone.text;
	const metaClass = disabled ? "text-white/20" : tone.meta;
	const accentClass = disabled ? "bg-white/15" : tone.accent;

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			disabled={disabled}
			testID={testID}
			className={`min-h-[52px] overflow-hidden rounded-[18px] border ${borderClass} ${bgClass} px-3 py-2 ${className}`}
			style={animatedStyle}
		>
			<View className="absolute inset-0 rounded-[18px] border border-white/5" />
			<View className={`absolute left-0 top-0 h-full w-1.5 ${accentClass}`} />
			<View className="flex-row items-center gap-3">
				{icon && (
					<View className="h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/5">
						{icon}
					</View>
				)}
				<View className="flex-1">
					<Text
						className={`font-mono text-[11px] uppercase tracking-[0.18em] ${textClass}`}
					>
						{label}
					</Text>
					{meta && (
						<Text className={`mt-1 font-mono text-[10px] ${metaClass}`}>
							{meta}
						</Text>
					)}
				</View>
			</View>
		</AnimatedPressable>
	);
}
