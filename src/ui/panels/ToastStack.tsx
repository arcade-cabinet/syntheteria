/**
 * ToastStack — renders stacked toast notifications.
 *
 * Position: bottom-right, above HarvestNotifications.
 * Categories use the game's signal language:
 *   combat → crimson
 *   harvest → amber
 *   construction → amber
 *   turn → purple
 *   system → cyan
 *   tutorial → green
 *
 * Touch target: 44px minimum tap to dismiss.
 * Auto-dismiss via the toast system timers.
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import {
	dismissToast,
	getVisibleToasts,
	subscribeToasts,
	type ToastCategory,
} from "../../systems/toastNotifications";
import { AlertIcon, BoltIcon, HammerIcon, MapIcon, WrenchIcon } from "../icons";

const CATEGORY_STYLES: Record<
	ToastCategory,
	{
		border: string;
		bg: string;
		label: string;
		labelColor: string;
		textColor: string;
	}
> = {
	combat: {
		border: "rgba(255, 120, 120, 0.25)",
		bg: "rgba(25, 13, 16, 0.92)",
		label: "Combat",
		labelColor: "#ff9f9f",
		textColor: "#ffe2e2",
	},
	harvest: {
		border: "rgba(246, 197, 106, 0.25)",
		bg: "rgba(12, 16, 20, 0.92)",
		label: "Harvest",
		labelColor: "#f6c56a",
		textColor: "#fff4de",
	},
	construction: {
		border: "rgba(246, 197, 106, 0.25)",
		bg: "rgba(12, 16, 20, 0.92)",
		label: "Construction",
		labelColor: "#f6c56a",
		textColor: "#fff4de",
	},
	turn: {
		border: "rgba(176, 136, 216, 0.25)",
		bg: "rgba(16, 12, 22, 0.92)",
		label: "Turn",
		labelColor: "#d4b0ff",
		textColor: "#ebe0ff",
	},
	system: {
		border: "rgba(139, 230, 255, 0.25)",
		bg: "rgba(8, 19, 26, 0.92)",
		label: "System",
		labelColor: "#8be6ff",
		textColor: "#e4f9ff",
	},
	tutorial: {
		border: "rgba(111, 243, 200, 0.25)",
		bg: "rgba(7, 17, 23, 0.92)",
		label: "Tutorial",
		labelColor: "#7ee7cb",
		textColor: "#dffef2",
	},
};

function CategoryIcon({
	category,
	color,
}: {
	category: ToastCategory;
	color: string;
}) {
	const size = 14;
	switch (category) {
		case "combat":
			return <AlertIcon width={size} height={size} color={color} />;
		case "harvest":
			return <WrenchIcon width={size} height={size} color={color} />;
		case "construction":
			return <HammerIcon width={size} height={size} color={color} />;
		case "turn":
			return <MapIcon width={size} height={size} color={color} />;
		case "system":
			return <BoltIcon width={size} height={size} color={color} />;
		case "tutorial":
			return <MapIcon width={size} height={size} color={color} />;
	}
}

export function ToastStack() {
	const toasts = useSyncExternalStore(subscribeToasts, getVisibleToasts);

	if (toasts.length === 0) return null;

	return (
		<View
			testID="toast-stack"
			style={{
				position: "absolute",
				right: 16,
				bottom: 16,
				gap: 8,
				maxWidth: 320,
				pointerEvents: "box-none",
			}}
		>
			{toasts.map((toast) => {
				const style = CATEGORY_STYLES[toast.category];
				return (
					<Pressable
						key={toast.id}
						testID={`toast-${toast.id}`}
						onPress={() => dismissToast(toast.id)}
						accessibilityLabel={`${style.label}: ${toast.title}. ${toast.message}. Tap to dismiss.`}
						accessibilityRole="alert"
						style={{
							minWidth: 240,
							minHeight: 44,
							borderRadius: 16,
							borderWidth: 1,
							borderColor: style.border,
							backgroundColor: style.bg,
							paddingHorizontal: 14,
							paddingVertical: 10,
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
							}}
						>
							<CategoryIcon
								category={toast.category}
								color={style.labelColor}
							/>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: 2,
									color: style.labelColor,
									textTransform: "uppercase",
								}}
							>
								{toast.title}
							</Text>
						</View>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 12,
								color: style.textColor,
								marginTop: 4,
								lineHeight: 16,
							}}
						>
							{toast.message}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
