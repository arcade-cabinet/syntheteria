import type React from "react";
import { Text, View } from "react-native";

interface HudPanelProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "warning";
}

export function HudPanel({
	title,
	children,
	className = "",
	variant = "default",
}: HudPanelProps) {
	const borderColor =
		variant === "warning" ? "border-amber-500/50" : "border-emerald-500/30";
	const headerColor =
		variant === "warning" ? "bg-amber-500/20" : "bg-emerald-500/20";
	const textColor =
		variant === "warning" ? "text-amber-400" : "text-emerald-400";

	return (
		<View className={`bg-black/80 border ${borderColor} p-3 ${className}`}>
			{/* Cyberpunk corner accent */}
			<View
				className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${borderColor} opacity-50`}
			/>
			<View
				className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${borderColor} opacity-50`}
			/>

			{title && (
				<View
					className={`mb-3 pb-1 border-b ${borderColor} ${headerColor} -mx-3 -mt-3 p-3 flex-row items-center`}
				>
					<View
						className={`w-2 h-2 ${variant === "warning" ? "bg-amber-400" : "bg-emerald-400"} mr-2`}
					/>
					<Text
						className={`font-mono text-sm tracking-widest uppercase font-bold ${textColor}`}
					>
						{title}
					</Text>
				</View>
			)}

			{children}
		</View>
	);
}
