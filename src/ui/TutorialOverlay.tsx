/**
 * TutorialOverlay — in-game HUD layer for the first-5-minutes experience.
 *
 * Three sub-components:
 *
 *  1. TutorialStepPanel  — bottom-center panel showing the current tutorial
 *     step: otter avatar, step title, otter dialogue quote, progress bar,
 *     step counter, and SKIP button. Fades in when active, collapses when done.
 *
 *  2. OtterDialogueToast — floating top-center notification for queued otter
 *     dialogue lines (from questDialogue). Auto-dismisses after display
 *     duration. Click to advance manually.
 *
 *  3. WaypointIndicator  — a pulsing ring around the crosshair that tells
 *     the player to "look here" when a tutorial target exists. The indicator
 *     is purely decorative (no world-space projection) — it pulses in the
 *     centre-bottom HUD area with the target label.
 *
 * All state is read from:
 *   - tutorialSystem (subscribeTutorial / getTutorialSnapshot)
 *   - questDialogue  (subscribeDialogue / getDialogueSnapshot)
 *
 * Accessibility: role="status", aria-live="polite" for step panel;
 *               role="alert", aria-live="assertive" for dialogue toasts.
 */

import { memo, useCallback, useSyncExternalStore } from "react";
import {
	advanceDialogue,
	getDialogueSnapshot,
	subscribeDialogue,
} from "../systems/questDialogue";
import {
	getTutorialSnapshot,
	skipCurrentStep,
	skipTutorial,
	subscribeTutorial,
} from "../systems/tutorialSystem";
import { FONT_MONO } from "./designTokens";
import { fillToCSSPercent } from "./hudGauges";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTTER_COLOR = "#00ffaa";
const OTTER_DIM = "#00ffaa66";
const OTTER_FAINT = "#00ffaa22";

// ─── ASCII otter avatar (small, consistent across steps) ─────────────────────

const OTTER_MINI = [
	" .--. ",
	"(o  o)",
	" \\__/ ",
];

// ─── TutorialStepPanel ───────────────────────────────────────────────────────

const TutorialStepPanel = memo(function TutorialStepPanel() {
	const snap = useSyncExternalStore(subscribeTutorial, getTutorialSnapshot);

	const onSkipStep = useCallback(() => skipCurrentStep(), []);
	const onSkipAll = useCallback(() => skipTutorial(), []);

	if (!snap.active) return null;

	const step = snap.steps[snap.currentStepIndex] ?? null;
	if (!step) return null;

	const stepNum = snap.currentStepIndex + 1;
	const totalSteps = snap.steps.length;
	const progressFill = step.completionTarget > 0
		? step.current / step.completionTarget
		: 0;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`Tutorial step ${stepNum} of ${totalSteps}: ${step.title}`}
			style={{
				position: "absolute",
				bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0, 10, 6, 0.90)",
				border: `1px solid ${OTTER_COLOR}44`,
				borderRadius: "8px",
				padding: "12px 16px",
				pointerEvents: "auto",
				fontFamily: FONT_MONO,
				minWidth: "280px",
				maxWidth: "min(380px, 90vw)",
				boxShadow: `0 0 24px ${OTTER_COLOR}18`,
			}}
		>
			{/* Header row: otter avatar + step label */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: "10px",
					marginBottom: "8px",
				}}
			>
				{/* Tiny otter */}
				<div
					aria-hidden="true"
					style={{
						fontFamily: FONT_MONO,
						fontSize: "9px",
						color: OTTER_COLOR,
						lineHeight: 1.3,
						textShadow: `0 0 6px ${OTTER_COLOR}66`,
						flexShrink: 0,
						whiteSpace: "pre",
					}}
				>
					{OTTER_MINI.join("\n")}
				</div>

				{/* Title + step number */}
				<div style={{ flex: 1 }}>
					<div
						style={{
							fontSize: "9px",
							color: OTTER_DIM,
							letterSpacing: "0.18em",
							marginBottom: "2px",
						}}
					>
						TUTORIAL {stepNum}/{totalSteps}
					</div>
					<div
						style={{
							fontSize: "13px",
							fontWeight: "bold",
							color: OTTER_COLOR,
							letterSpacing: "0.08em",
							textShadow: `0 0 8px ${OTTER_COLOR}44`,
						}}
					>
						{step.title.toUpperCase()}
					</div>
				</div>
			</div>

			{/* Otter dialogue quote */}
			<div
				style={{
					fontSize: "11px",
					color: "rgba(184,255,220,0.75)",
					lineHeight: 1.5,
					borderLeft: `2px solid ${OTTER_COLOR}44`,
					paddingLeft: "8px",
					marginBottom: "10px",
					fontStyle: "italic",
				}}
			>
				"{step.otterDialogue}"
			</div>

			{/* Instruction */}
			<div
				style={{
					fontSize: "11px",
					color: OTTER_DIM,
					letterSpacing: "0.05em",
					marginBottom: "8px",
				}}
			>
				{step.instruction}
			</div>

			{/* Progress bar (only shown when completionTarget > 1) */}
			{step.completionTarget > 1 && (
				<div style={{ marginBottom: "8px" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "9px",
							color: OTTER_DIM,
							marginBottom: "3px",
							letterSpacing: "0.08em",
						}}
					>
						<span>PROGRESS</span>
						<span>{step.current}/{step.completionTarget}</span>
					</div>
					<div
						role="progressbar"
						aria-valuenow={step.current}
						aria-valuemin={0}
						aria-valuemax={step.completionTarget}
						aria-label={`Tutorial progress: ${step.current} of ${step.completionTarget}`}
						style={{
							width: "100%",
							height: "3px",
							background: OTTER_FAINT,
							borderRadius: "2px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								width: fillToCSSPercent(progressFill),
								height: "100%",
								background: `linear-gradient(90deg, ${OTTER_COLOR}, #00aaff)`,
								borderRadius: "2px",
								transition: "width 0.2s ease-out",
							}}
						/>
					</div>
				</div>
			)}

			{/* Skip buttons */}
			<div
				style={{
					display: "flex",
					gap: "6px",
					justifyContent: "flex-end",
				}}
			>
				<button
					onClick={onSkipStep}
					aria-label="Skip this tutorial step"
					style={{
						background: "transparent",
						border: `1px solid ${OTTER_DIM}`,
						borderRadius: "3px",
						color: OTTER_DIM,
						fontFamily: FONT_MONO,
						fontSize: "9px",
						letterSpacing: "0.12em",
						padding: "3px 8px",
						cursor: "pointer",
						minHeight: "28px",
					}}
				>
					SKIP STEP
				</button>
				<button
					onClick={onSkipAll}
					aria-label="Skip entire tutorial"
					style={{
						background: "transparent",
						border: `1px solid ${OTTER_FAINT}`,
						borderRadius: "3px",
						color: `${OTTER_DIM}88`,
						fontFamily: FONT_MONO,
						fontSize: "9px",
						letterSpacing: "0.12em",
						padding: "3px 8px",
						cursor: "pointer",
						minHeight: "28px",
					}}
				>
					SKIP ALL
				</button>
			</div>
		</div>
	);
});

// ─── OtterDialogueToast ───────────────────────────────────────────────────────

const OtterDialogueToast = memo(function OtterDialogueToast() {
	const entry = useSyncExternalStore(subscribeDialogue, getDialogueSnapshot);

	const onAdvance = useCallback(() => advanceDialogue(), []);

	if (!entry) return null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			aria-label={`Otter: ${entry.line}`}
			onClick={onAdvance}
			style={{
				position: "absolute",
				top: "calc(50px + env(safe-area-inset-top, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0, 14, 8, 0.92)",
				border: `1px solid ${OTTER_COLOR}55`,
				borderRadius: "8px",
				padding: "10px 14px",
				maxWidth: "min(320px, 85vw)",
				pointerEvents: "auto",
				cursor: "pointer",
				fontFamily: FONT_MONO,
				boxShadow: `0 0 18px ${OTTER_COLOR}14`,
				zIndex: 50,
			}}
		>
			{/* Otter label + quest id */}
			<div
				style={{
					fontSize: "9px",
					color: OTTER_DIM,
					letterSpacing: "0.2em",
					marginBottom: "5px",
				}}
			>
				SABLE // {entry.questId.replace(/_/g, " ").toUpperCase()}
			</div>

			{/* Dialogue line */}
			<div
				style={{
					fontSize: "12px",
					color: OTTER_COLOR,
					lineHeight: 1.55,
					textShadow: `0 0 6px ${OTTER_COLOR}44`,
				}}
			>
				{entry.line}
			</div>

			{/* Tap hint */}
			<div
				style={{
					fontSize: "9px",
					color: `${OTTER_DIM}88`,
					textAlign: "right",
					marginTop: "5px",
					letterSpacing: "0.1em",
				}}
			>
				tap to dismiss
			</div>

			{/* Tail pointing down */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					bottom: "-8px",
					left: "50%",
					transform: "translateX(-50%)",
					width: 0,
					height: 0,
					borderLeft: "8px solid transparent",
					borderRight: "8px solid transparent",
					borderTop: `8px solid ${OTTER_COLOR}55`,
				}}
			/>
		</div>
	);
});

// ─── WaypointIndicator ────────────────────────────────────────────────────────

const WaypointIndicator = memo(function WaypointIndicator() {
	const snap = useSyncExternalStore(subscribeTutorial, getTutorialSnapshot);

	if (!snap.active) return null;

	const step = snap.steps[snap.currentStepIndex] ?? null;
	if (!step || step.completionType === "action") return null;

	// Only show for position / item / build targets (not pure action steps)
	const targetLabel = step.completionKey.replace(/_/g, " ").toUpperCase();

	return (
		<div
			aria-label={`Tutorial target: ${targetLabel}`}
			style={{
				position: "absolute",
				bottom: "calc(200px + env(safe-area-inset-bottom, 0px))",
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "4px",
				pointerEvents: "none",
			}}
		>
			{/* Pulsing ring */}
			<div
				aria-hidden="true"
				style={{
					width: "28px",
					height: "28px",
					borderRadius: "50%",
					border: `2px solid ${OTTER_COLOR}`,
					boxShadow: `0 0 10px ${OTTER_COLOR}66, 0 0 20px ${OTTER_COLOR}22`,
					animation: "tutorial-pulse 1.4s ease-in-out infinite",
				}}
			/>
			{/* Target label */}
			<div
				style={{
					fontFamily: FONT_MONO,
					fontSize: "9px",
					color: OTTER_DIM,
					letterSpacing: "0.15em",
					textAlign: "center",
				}}
			>
				TARGET: {targetLabel}
			</div>

			{/* CSS animation injected inline — avoids needing a global stylesheet */}
			<style>{`
				@keyframes tutorial-pulse {
					0%   { transform: scale(1);   opacity: 1; }
					50%  { transform: scale(1.3); opacity: 0.6; }
					100% { transform: scale(1);   opacity: 1; }
				}
			`}</style>
		</div>
	);
});

// ─── Public export ────────────────────────────────────────────────────────────

export function TutorialOverlay() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				fontFamily: FONT_MONO,
				zIndex: 20,
			}}
		>
			<OtterDialogueToast />
			<TutorialStepPanel />
			<WaypointIndicator />
		</div>
	);
}
