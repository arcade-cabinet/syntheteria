/**
 * KeybindHints — small bottom-left overlay showing available keyboard shortcuts.
 *
 * Only shown on desktop (non-touch) devices.
 * Compact, semi-transparent, doesn't block gameplay.
 */

import { Platform, Text, View, useWindowDimensions } from "react-native";

function Hint({ keys, label }: { keys: string; label: string }) {
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
			<View
				style={{
					paddingHorizontal: 5,
					paddingVertical: 2,
					borderRadius: 4,
					borderWidth: 1,
					borderColor: "rgba(139, 230, 255, 0.2)",
					backgroundColor: "rgba(139, 230, 255, 0.06)",
					minWidth: 22,
					alignItems: "center",
				}}
			>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						color: "#8be6ff",
						fontWeight: "600",
					}}
				>
					{keys}
				</Text>
			</View>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 9,
					color: "rgba(255, 255, 255, 0.4)",
					letterSpacing: 0.5,
				}}
			>
				{label}
			</Text>
		</View>
	);
}

export function KeybindHints() {
	const { width } = useWindowDimensions();

	// Only show on desktop-width screens and web platform
	if (Platform.OS !== "web" || width < 768) return null;

	return (
		<View
			testID="keybind-hints"
			style={{
				position: "absolute",
				left: 12,
				bottom: 12,
				gap: 4,
				pointerEvents: "none",
				opacity: 0.7,
			}}
		>
			<Hint keys="Tab" label="Cycle units" />
			<Hint keys="Enter" label="End turn" />
			<Hint keys="Esc" label="Cancel" />
			<Hint keys="WASD" label="Pan camera" />
			<Hint keys="Z" label="Zoom" />
		</View>
	);
}
