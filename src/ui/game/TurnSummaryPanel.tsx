/**
 * TurnSummaryPanel — brief animated summary after ADVANCE.
 *
 * Shows: resources gained/lost, territory delta, combats resolved,
 * research progress, fabrication completions, and pending completions.
 *
 * Auto-dismisses after a timeout or on click. Positioned center-screen
 * with a translucent dark backdrop.
 *
 * This is the "dopamine hit" — it tells the player "stuff happened,
 * and more will happen next turn."
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
	clearTurnSummary,
	getTurnSummary,
	subscribeTurnSummary,
	type TurnSummaryData,
} from "../../ecs/systems/turnSummary";

// ─── Constants ──────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 6000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 300;

// ─── Styles ──────────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
	position: "absolute",
	left: "50%",
	top: "50%",
	transform: "translate(-50%, -50%)",
	minWidth: 280,
	maxWidth: 380,
	borderRadius: 12,
	border: "1px solid rgba(176, 136, 216, 0.3)",
	backgroundColor: "rgba(8, 6, 16, 0.94)",
	padding: "16px 20px",
	pointerEvents: "auto",
	cursor: "pointer",
	zIndex: 50,
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const HEADER_STYLE: React.CSSProperties = {
	fontSize: 10,
	letterSpacing: 3,
	color: "#d4b0ff",
	textTransform: "uppercase",
	marginBottom: 12,
	textAlign: "center",
};

const SECTION_STYLE: React.CSSProperties = {
	marginBottom: 8,
};

const LABEL_STYLE: React.CSSProperties = {
	fontSize: 8,
	letterSpacing: 2,
	color: "rgba(139, 230, 255, 0.5)",
	textTransform: "uppercase",
	marginBottom: 3,
};

const ENTRY_STYLE: React.CSSProperties = {
	fontSize: 11,
	color: "rgba(255, 255, 255, 0.8)",
	lineHeight: "16px",
};

const POSITIVE_COLOR = "#7ee7cb";
const NEGATIVE_COLOR = "#ff8f8f";
const NEUTRAL_COLOR = "rgba(255, 255, 255, 0.6)";
const PENDING_COLOR = "#f6c56a";

// ─── Component ───────────────────────────────────────────────────────────────

export function TurnSummaryPanel() {
	const summary = useSyncExternalStore(subscribeTurnSummary, getTurnSummary);
	const [visible, setVisible] = useState(false);
	const [opacity, setOpacity] = useState(0);
	const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Show when summary appears — always show so player knows the turn advanced
	useEffect(() => {
		if (summary) {
			setVisible(true);
			setOpacity(0);
			// Fade in
			fadeTimer.current = setTimeout(() => setOpacity(1), 16);
			// Auto-dismiss (shorter if no content)
			const duration = hasContent(summary) ? AUTO_DISMISS_MS : 2500;
			dismissTimer.current = setTimeout(() => dismiss(), duration);
		}
		return () => {
			if (dismissTimer.current) clearTimeout(dismissTimer.current);
			if (fadeTimer.current) clearTimeout(fadeTimer.current);
		};
	}, [summary]);

	const dismiss = useCallback(() => {
		setOpacity(0);
		setTimeout(() => {
			setVisible(false);
			clearTurnSummary();
		}, FADE_OUT_MS);
	}, []);

	const handleClick = useCallback(() => {
		if (dismissTimer.current) clearTimeout(dismissTimer.current);
		dismiss();
	}, [dismiss]);

	if (!visible || !summary) return null;

	return (
		<div
			data-testid="turn-summary-panel"
			onClick={handleClick}
			style={{
				...PANEL_STYLE,
				opacity,
				transition: `opacity ${FADE_IN_MS}ms ease`,
			}}
		>
			<div style={HEADER_STYLE}>Cycle {summary.turn} Report</div>

			{/* Resource changes */}
			{summary.resourceChanges.length > 0 && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Resources</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
						{summary.resourceChanges.map((rc) => (
							<span
								key={rc.material}
								style={{
									...ENTRY_STYLE,
									color: rc.net > 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
								}}
							>
								{rc.shortName} {rc.net > 0 ? "+" : ""}{rc.net}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Territory */}
			{summary.territoryDelta !== 0 && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Territory</div>
					<span
						style={{
							...ENTRY_STYLE,
							color: summary.territoryDelta > 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
						}}
					>
						{summary.territoryDelta > 0 ? "+" : ""}{summary.territoryDelta} tiles ({summary.territoryTotal} total)
					</span>
				</div>
			)}

			{/* Combat */}
			{summary.combats.length > 0 && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Combat</div>
					{summary.combats.map((c, i) => (
						<div key={i} style={{ ...ENTRY_STYLE, color: "#ff9f9f" }}>
							{c.message}
						</div>
					))}
				</div>
			)}

			{/* Fabrication completed */}
			{summary.fabricationCompleted.length > 0 && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Fabrication Complete</div>
					{summary.fabricationCompleted.map((f, i) => (
						<div key={i} style={{ ...ENTRY_STYLE, color: POSITIVE_COLOR }}>
							{f} online
						</div>
					))}
				</div>
			)}

			{/* Research */}
			{summary.researchProgress && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Research</div>
					<span style={{ ...ENTRY_STYLE, color: "#b088d8" }}>
						{summary.researchProgress.techName}: {summary.researchProgress.turnsLeft === 0 ? "COMPLETE" : `${summary.researchProgress.turnsLeft}t remaining`}
					</span>
				</div>
			)}

			{/* Cult events */}
			{summary.cultEvents.length > 0 && (
				<div style={SECTION_STYLE}>
					<div style={LABEL_STYLE}>Incursions</div>
					{summary.cultEvents.map((ce, i) => (
						<div key={i} style={{ ...ENTRY_STYLE, color: "#ff8f8f" }}>
							{ce}
						</div>
					))}
				</div>
			)}

			{/* Pending completions — the "one more turn" hook */}
			{summary.pendingCompletions.length > 0 && (
				<div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
					<div style={LABEL_STYLE}>Next Cycle</div>
					{summary.pendingCompletions.map((p, i) => (
						<div key={i} style={{ ...ENTRY_STYLE, color: PENDING_COLOR }}>
							{p} completes
						</div>
					))}
				</div>
			)}

			{/* No content fallback */}
			{!hasContent(summary) && (
				<div style={{ ...ENTRY_STYLE, color: NEUTRAL_COLOR, textAlign: "center" }}>
					Systems nominal. No activity.
				</div>
			)}

			{/* Dismiss hint */}
			<div
				style={{
					fontSize: 8,
					color: "rgba(255, 255, 255, 0.25)",
					textAlign: "center",
					marginTop: 10,
					letterSpacing: 1,
				}}
			>
				CLICK TO DISMISS
			</div>
		</div>
	);
}

/** Check if the summary has any content worth showing. */
function hasContent(summary: TurnSummaryData): boolean {
	return (
		summary.resourceChanges.length > 0 ||
		summary.territoryDelta !== 0 ||
		summary.combats.length > 0 ||
		summary.fabricationCompleted.length > 0 ||
		summary.researchProgress !== null ||
		summary.pendingCompletions.length > 0 ||
		summary.cultEvents.length > 0
	);
}
