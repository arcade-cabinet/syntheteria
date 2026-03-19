/**
 * TutorialOverlay — shows tutorial instruction text and skip button.
 *
 * Position: bottom-center, above the game world.
 * Instruction text in a compact panel with progress dots.
 * Skip button for experienced players.
 *
 * Does not block gameplay input — pointer-events pass through except
 * on the skip button itself.
 *
 * Ported from pending/ui/panels/TutorialOverlay.tsx — rewired to src tutorialSystem.
 */

import { useSyncExternalStore } from "react";
import {
	getAllSteps,
	getCurrentStep,
	getTutorialState,
	skipTutorial,
	subscribeTutorial,
} from "../../systems/tutorialSystem";

export function TutorialOverlay({ turn }: { turn: number }) {
	const state = useSyncExternalStore(subscribeTutorial, getTutorialState);
	const step = getCurrentStep(turn);

	if (!state.active || state.skipped || !step) return null;

	const allSteps = getAllSteps();

	return (
		<div
			data-testid="tutorial-overlay"
			style={{
				position: "absolute",
				bottom: 24,
				left: 0,
				right: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				pointerEvents: "none",
				zIndex: 30,
			}}
		>
			<div
				style={{
					maxWidth: 400,
					width: "90%",
					borderRadius: 16,
					border: "1px solid rgba(111, 243, 200, 0.3)",
					backgroundColor: "rgba(7, 17, 23, 0.94)",
					paddingLeft: 20,
					paddingRight: 20,
					paddingTop: 14,
					paddingBottom: 14,
					pointerEvents: "auto",
				}}
			>
				{/* Eyebrow */}
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 8,
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							letterSpacing: 2,
							color: "#7ee7cb",
							textTransform: "uppercase",
						}}
					>
						Tutorial — Cycle {step.turnNumber}
					</span>

					{/* Skip button */}
					<button
						type="button"
						data-testid="tutorial-skip-button"
						onClick={skipTutorial}
						aria-label="Skip tutorial"
						style={{
							paddingLeft: 12,
							paddingRight: 12,
							paddingTop: 6,
							paddingBottom: 6,
							borderRadius: 8,
							border: "1px solid rgba(255, 255, 255, 0.15)",
							backgroundColor: "rgba(255, 255, 255, 0.04)",
							minHeight: 32,
							cursor: "pointer",
						}}
					>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 1.5,
								color: "rgba(255, 255, 255, 0.6)",
								textTransform: "uppercase",
							}}
						>
							Skip
						</span>
					</button>
				</div>

				{/* Instruction */}
				<p
					data-testid="tutorial-instruction"
					style={{
						margin: 0,
						fontFamily: "monospace",
						fontSize: 14,
						fontWeight: "600",
						color: "#dffef2",
						letterSpacing: 0.5,
						lineHeight: "20px",
					}}
				>
					{step.instruction}
				</p>

				{/* Progress dots */}
				<div
					style={{
						display: "flex",
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
							<div
								key={s.id}
								style={{
									width: isCurrent ? 16 : 6,
									height: 6,
									borderRadius: 3,
									backgroundColor: isCompleted
										? "#7ee7cb"
										: isCurrent
											? "#7ee7cb"
											: "rgba(255, 255, 255, 0.15)",
								}}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
