/**
 * Quest HUD panel — shows active quest tracker, progress bar, and
 * otter dialogue overlay.
 *
 * Positioned in the top-left corner below the resource bar. Uses the
 * same terminal aesthetic as the rest of the Syntheteria UI.
 *
 * Components:
 * - Active quest name and description
 * - Progress bar (current / target)
 * - Completion notification with reward info
 * - Otter portrait area next to dialogue text
 */

import { useEffect, useState } from "react";
import {
	advanceDialogue,
	getCurrentDialogue,
	updateDialogue,
} from "../systems/questDialogue";
import {
	getActiveQuests,
	getQuestProgress,
	type QuestState,
} from "../systems/questSystem";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";

const PANEL: React.CSSProperties = {
	position: "absolute",
	top: "calc(80px + var(--sat))",
	left: "calc(12px + var(--sal))",
	background: "rgba(0, 12, 8, 0.88)",
	border: "1px solid rgba(0, 255, 160, 0.3)",
	borderRadius: "8px",
	padding: "10px 14px",
	width: "var(--panel-w)",
	fontFamily: MONO,
	color: "#00ffaa",
	pointerEvents: "auto",
	maxHeight: "40vh",
	overflowY: "auto",
};

const QUEST_TITLE: React.CSSProperties = {
	fontSize: "var(--ui-sm)",
	fontWeight: "bold",
	letterSpacing: "0.08em",
	marginBottom: "4px",
	color: "#00ffcc",
	textShadow: "0 0 6px rgba(0,255,160,0.2)",
};

const QUEST_DESC: React.CSSProperties = {
	fontSize: "var(--ui-xs)",
	color: "#00ffaa88",
	marginBottom: "6px",
	lineHeight: "1.5",
};

const PROGRESS_OUTER: React.CSSProperties = {
	width: "100%",
	height: "6px",
	background: "rgba(0, 255, 160, 0.08)",
	borderRadius: "3px",
	overflow: "hidden",
	marginBottom: "4px",
};

const PROGRESS_TEXT: React.CSSProperties = {
	fontSize: "var(--ui-xs)",
	color: "#00ffaa66",
	textAlign: "right",
};

const DIALOGUE_BOX: React.CSSProperties = {
	marginTop: "8px",
	borderTop: "1px solid rgba(0, 255, 160, 0.15)",
	paddingTop: "8px",
	display: "flex",
	gap: "8px",
	alignItems: "flex-start",
	cursor: "pointer",
	userSelect: "none",
};

const OTTER_PORTRAIT: React.CSSProperties = {
	width: "28px",
	height: "28px",
	borderRadius: "50%",
	border: "1px solid rgba(0, 255, 160, 0.4)",
	background: "rgba(0, 255, 160, 0.08)",
	flexShrink: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: "14px",
};

const DIALOGUE_TEXT: React.CSSProperties = {
	fontSize: "var(--ui-xs)",
	color: "#00ffaa",
	lineHeight: "1.5",
	textShadow: "0 0 6px rgba(0,255,160,0.15)",
};

const ADVANCE_HINT: React.CSSProperties = {
	display: "block",
	textAlign: "right",
	marginTop: "4px",
	fontSize: "10px",
	opacity: 0.5,
};

const COMPLETION_BANNER: React.CSSProperties = {
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	background: "rgba(0, 18, 12, 0.95)",
	border: "2px solid #00ffaa",
	borderRadius: "12px",
	padding: "16px 28px",
	fontFamily: MONO,
	color: "#00ffcc",
	textAlign: "center",
	zIndex: 500,
	pointerEvents: "auto",
	boxShadow: "0 0 32px rgba(0,255,160,0.2)",
};

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function QuestTracker({ quest }: { quest: QuestState }) {
	const progress = getQuestProgress(quest.id);
	if (!progress) return null;

	const ratio = progress.target > 0 ? progress.current / progress.target : 0;
	const percent = Math.min(100, Math.round(ratio * 100));

	return (
		<div style={{ marginBottom: "8px" }}>
			<div style={QUEST_TITLE}>{quest.definition.name}</div>
			<div style={QUEST_DESC}>{progress.description}</div>
			<div style={PROGRESS_OUTER}>
				<div
					style={{
						width: `${percent}%`,
						height: "100%",
						background:
							percent >= 100
								? "#00ffcc"
								: "linear-gradient(90deg, #00ffaa44, #00ffaa)",
						borderRadius: "3px",
						transition: "width 0.3s ease",
						boxShadow: percent >= 100 ? "0 0 8px rgba(0,255,204,0.4)" : "none",
					}}
				/>
			</div>
			<div style={PROGRESS_TEXT}>
				{progress.current} / {progress.target}
			</div>
		</div>
	);
}

function DialogueOverlay() {
	const dialogue = getCurrentDialogue();
	if (!dialogue) return null;

	return (
		<div style={DIALOGUE_BOX} onClick={() => advanceDialogue()}>
			<div style={OTTER_PORTRAIT}>
				<span role="img" aria-label="otter">
					~
				</span>
			</div>
			<div style={{ flex: 1 }}>
				<div style={DIALOGUE_TEXT}>{dialogue.line}</div>
				<span style={ADVANCE_HINT}>tap to continue</span>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Completion notification
// ---------------------------------------------------------------------------

function CompletionNotification({
	questName,
	reward,
	onDismiss,
}: {
	questName: string;
	reward: Record<string, number>;
	onDismiss: () => void;
}) {
	const rewardEntries = Object.entries(reward).filter(([_, v]) => v > 0);

	return (
		<div style={COMPLETION_BANNER} onClick={onDismiss}>
			<div
				style={{
					fontSize: "var(--ui-lg)",
					fontWeight: "bold",
					marginBottom: "8px",
				}}
			>
				QUEST COMPLETE
			</div>
			<div
				style={{
					fontSize: "var(--ui-md)",
					color: "#00ffaa",
					marginBottom: "8px",
				}}
			>
				{questName}
			</div>
			{rewardEntries.length > 0 && (
				<div style={{ fontSize: "var(--ui-sm)", color: "#00ffaa88" }}>
					{rewardEntries.map(([key, amount]) => (
						<div key={key}>
							+{amount} {key.replace(/([A-Z])/g, " $1").toLowerCase()}
						</div>
					))}
				</div>
			)}
			<div
				style={{
					fontSize: "var(--ui-xs)",
					color: "#00ffaa44",
					marginTop: "12px",
				}}
			>
				tap to dismiss
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function QuestPanel() {
	const [, setTick] = useState(0);
	const [completedQuest, setCompletedQuest] = useState<{
		name: string;
		reward: Record<string, number>;
	} | null>(null);

	// Re-render periodically to pick up quest state changes.
	// This avoids coupling to the ECS store subscription for this overlay.
	useEffect(() => {
		let animFrame: number;
		let lastTime = 0;

		const loop = (time: number) => {
			const delta = (time - lastTime) / 1000;
			lastTime = time;

			if (delta > 0 && delta < 1) {
				updateDialogue(delta);
			}

			setTick((t) => t + 1);
			animFrame = requestAnimationFrame(loop);
		};

		animFrame = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(animFrame);
	}, []);

	const activeQuests = getActiveQuests();

	if (activeQuests.length === 0 && !getCurrentDialogue() && !completedQuest) {
		return null;
	}

	return (
		<>
			{/* Quest tracker panel */}
			{activeQuests.length > 0 && (
				<div style={PANEL}>
					<div
						style={{
							fontSize: "var(--ui-xs)",
							color: "#00ffaa44",
							letterSpacing: "0.15em",
							marginBottom: "6px",
						}}
					>
						ACTIVE QUEST
					</div>
					{activeQuests.map((quest) => (
						<QuestTracker key={quest.id} quest={quest} />
					))}
					<DialogueOverlay />
				</div>
			)}

			{/* Stand-alone dialogue when no quest is active but dialogue remains */}
			{activeQuests.length === 0 && getCurrentDialogue() && (
				<div style={PANEL}>
					<DialogueOverlay />
				</div>
			)}

			{/* Completion notification overlay */}
			{completedQuest && (
				<CompletionNotification
					questName={completedQuest.name}
					reward={completedQuest.reward}
					onDismiss={() => setCompletedQuest(null)}
				/>
			)}
		</>
	);
}
