/**
 * TutorialOverlay — shows tutorial instruction text and skip button.
 *
 * Position: bottom-center, above the game world.
 * Instruction text in a compact panel with progress dots.
 * Skip button for experienced players.
 *
 * Does not block gameplay input — pointer-events pass through except
 * on the skip button itself.
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import {
	getAllSteps,
	getCurrentStep,
	getTutorialState,
	skipTutorial,
	subscribeTutorial,
} from "../../systems/tutorialSystem";

export function TutorialOverlay() {
	const state = useSyncExternalStore(subscribeTutorial, getTutorialState);
	const step = getCurrentStep();

	if (!state.active || state.skipped || !step) return null;

	const allSteps = getAllSteps();

	return (
		<View
			testID="tutorial-overlay"
			style={{
				position: "absolute",
				bottom: 24,
				left: 0,
				right: 0,
				alignItems: "center",
				pointerEvents: "box-none",
			}}
		>
			<View
				style={{
					maxWidth: 400,
					width: "90%",
					borderRadius: 16,
					borderWidth: 1,
					borderColor: "rgba(111, 243, 200, 0.3)",
					backgroundColor: "rgba(7, 17, 23, 0.94)",
					paddingHorizontal: 20,
					paddingVertical: 14,
					pointerEvents: "auto",
				}}
			>
				{/* Eyebrow */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 8,
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							letterSpacing: 2,
							color: "#7ee7cb",
							textTransform: "uppercase",
						}}
					>
						Tutorial — Turn {step.turnNumber}
					</Text>

					{/* Skip button */}
					<Pressable
						testID="tutorial-skip-button"
						onPress={skipTutorial}
						accessibilityLabel="Skip tutorial"
						accessibilityRole="button"
						style={({ pressed }) => ({
							paddingHorizontal: 12,
							paddingVertical: 6,
							borderRadius: 8,
							borderWidth: 1,
							borderColor: pressed
								? "rgba(255, 255, 255, 0.3)"
								: "rgba(255, 255, 255, 0.15)",
							backgroundColor: pressed
								? "rgba(255, 255, 255, 0.08)"
								: "rgba(255, 255, 255, 0.04)",
							minHeight: 32,
							justifyContent: "center",
						})}
					>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 1.5,
								color: "rgba(255, 255, 255, 0.6)",
								textTransform: "uppercase",
							}}
						>
							Skip
						</Text>
					</Pressable>
				</View>

				{/* Instruction */}
				<Text
					testID="tutorial-instruction"
					style={{
						fontFamily: "monospace",
						fontSize: 14,
						fontWeight: "600",
						color: "#dffef2",
						letterSpacing: 0.5,
						lineHeight: 20,
					}}
				>
					{step.instruction}
				</Text>

				{/* Progress dots */}
				<View
					style={{
						flexDirection: "row",
						gap: 6,
						marginTop: 12,
						justifyContent: "center",
					}}
				>
					{allSteps.map((s, i) => {
						const isCurrent = i === state.currentStepIndex;
						const isCompleted = state.completedSteps.includes(s.id);
						return (
							<View
								key={s.id}
								style={{
									width: isCurrent ? 16 : 6,
									height: 6,
									borderRadius: 3,
									backgroundColor: isCompleted
										? "#6ff3c8"
										: isCurrent
											? "#7ee7cb"
											: "rgba(255, 255, 255, 0.15)",
								}}
							/>
						);
					})}
				</View>
			</View>
		</View>
	);
}
