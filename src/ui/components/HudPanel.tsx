import type React from "react";
import { Text, View } from "react-native";

interface HudPanelProps {
	title?: string;
	eyebrow?: string;
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "warning" | "danger";
}

const PANEL_TONES = {
	default: {
		border: "border-[#6ff3c8]/25",
		header: "bg-[#6ff3c8]/10",
		glow: "bg-[#6ff3c8]/12",
		title: "text-[#d9fff3]",
		eyebrow: "text-[#7ee7cb]",
	},
	warning: {
		border: "border-[#f7c76d]/30",
		header: "bg-[#f7c76d]/12",
		glow: "bg-[#f7c76d]/12",
		title: "text-[#fff0c9]",
		eyebrow: "text-[#f6c56a]",
	},
	danger: {
		border: "border-[#ff7a7a]/30",
		header: "bg-[#ff7a7a]/12",
		glow: "bg-[#ff7a7a]/10",
		title: "text-[#ffe0e0]",
		eyebrow: "text-[#ff8f8f]",
	},
} as const;

export function HudPanel({
	title,
	eyebrow,
	children,
	className = "",
	variant = "default",
}: HudPanelProps) {
	const tone = PANEL_TONES[variant];

	return (
		<View
			className={`overflow-hidden rounded-[22px] border ${tone.border} bg-[#081017]/88 shadow-2xl ${className}`}
		>
			<View className={`absolute inset-x-0 top-0 h-20 ${tone.glow}`} />
			<View className="absolute inset-0 border border-white/5 rounded-[22px]" />
			<View className="px-4 pt-3 pb-3">
				{(eyebrow || title) && (
					<View
						className={`mb-3 rounded-2xl border border-white/8 ${tone.header} px-3 py-2`}
					>
						{eyebrow && (
							<Text
								className={`font-mono text-[10px] uppercase tracking-[0.24em] ${tone.eyebrow}`}
							>
								{eyebrow}
							</Text>
						)}
						{title && (
							<Text
								className={`mt-1 font-mono text-base uppercase tracking-[0.18em] ${tone.title}`}
							>
								{title}
							</Text>
						)}
					</View>
				)}
				{children}
			</View>
		</View>
	);
}
