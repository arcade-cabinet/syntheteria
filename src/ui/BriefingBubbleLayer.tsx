import { useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getActiveBriefingBubbles } from "../world/briefingBubbles";
import {
	getRuntimeState,
	setCitySiteModalOpen,
	subscribeRuntimeState,
} from "../world/runtimeState";
import { getActiveWorldSession } from "../world/session";

function positionStyle(screenHint: "top-left" | "top-center" | "top-right") {
	switch (screenHint) {
		case "top-left":
			return styles.left;
		case "top-right":
			return styles.right;
		case "top-center":
		default:
			return styles.center;
	}
}

function toneStyle(tone: "signal" | "mint" | "amber" | "crimson") {
	switch (tone) {
		case "mint":
			return {
				borderColor: "rgba(111, 243, 200, 0.28)",
				eyebrowColor: "#6ff3c8",
			};
		case "amber":
			return {
				borderColor: "rgba(246, 197, 106, 0.28)",
				eyebrowColor: "#f6c56a",
			};
		case "crimson":
			return {
				borderColor: "rgba(255, 143, 143, 0.28)",
				eyebrowColor: "#ff8f8f",
			};
		case "signal":
		default:
			return {
				borderColor: "rgba(139, 230, 255, 0.28)",
				eyebrowColor: "#8be6ff",
			};
	}
}

export function BriefingBubbleLayer() {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const bubbles = getActiveBriefingBubbles({
		runtime,
		session: getActiveWorldSession(),
	});

	if (bubbles.length === 0) {
		return null;
	}

	return (
		<View style={styles.layer}>
			{bubbles.map((bubble) => {
				const tone = toneStyle(bubble.tone);
				const canOpenSiteBrief =
					bubble.anchor === "nearby-site" || bubble.anchor === "active-site";
				const positioning = positionStyle(bubble.screenHint);
				if (!canOpenSiteBrief) {
					return (
						<View
							key={bubble.id}
							testID={`briefing-bubble-${bubble.anchor}`}
							style={[
								styles.bubble,
								positioning,
								{ borderColor: tone.borderColor },
							]}
						>
							<Text style={[styles.eyebrow, { color: tone.eyebrowColor }]}>
								{bubble.title}
							</Text>
							<Text style={styles.body}>{bubble.body}</Text>
						</View>
					);
				}

				return (
					<Pressable
						key={bubble.id}
						testID={`briefing-bubble-${bubble.anchor}`}
						onPress={() => setCitySiteModalOpen(true, runtime.nearbyPoi)}
						style={[
							styles.bubble,
							positioning,
							{ borderColor: tone.borderColor },
						]}
					>
						<Text style={[styles.eyebrow, { color: tone.eyebrowColor }]}>
							{bubble.title}
						</Text>
						<Text style={styles.body}>{bubble.body}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	layer: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 64,
		paddingHorizontal: 16,
		gap: 12,
		pointerEvents: "box-none",
	},
	bubble: {
		maxWidth: 360,
		borderRadius: 22,
		backgroundColor: "rgba(7, 17, 27, 0.92)",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		zIndex: 20,
		elevation: 20,
		shadowColor: "#000000",
		shadowOpacity: 0.34,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 18 },
	},
	left: {
		alignSelf: "flex-start",
	},
	right: {
		alignSelf: "flex-end",
	},
	center: {
		alignSelf: "center",
	},
	eyebrow: {
		fontFamily: "Courier",
		fontSize: 10,
		textTransform: "uppercase",
		letterSpacing: 2.2,
	},
	body: {
		marginTop: 8,
		fontFamily: "Courier",
		fontSize: 11,
		lineHeight: 18,
		color: "rgba(255, 255, 255, 0.76)",
	},
});
