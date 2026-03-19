/**
 * PauseMenu — overlay that pauses the game loop and offers:
 *   - Resume
 *   - Save Game
 *   - Quit to Title
 *
 * Rendered as a semi-transparent overlay over the game canvas.
 * All gameplay input is blocked while the pause menu is open.
 * Styled to match the machine-perception HUD language.
 *
 * Ported from pending/ui/PauseMenu.tsx — adapted to current save system
 * (prop-based onSave instead of saveAllStateSync import).
 */

import { useEffect, useRef, useState } from "react";
import {
	type FragmentDefinition,
	getFragmentProgress,
	getReadFragments,
} from "../../systems";
import { pushToast } from "./toastStore";

export interface PauseMenuProps {
	visible: boolean;
	onResume: () => void;
	onSave?: () => void;
	onQuitToTitle: () => void;
}

export function PauseMenu({
	visible,
	onResume,
	onSave,
	onQuitToTitle,
}: PauseMenuProps) {
	const resumeRef = useRef<HTMLButtonElement>(null);
	const [saving, setSaving] = useState(false);
	const [showFragments, setShowFragments] = useState(false);

	useEffect(() => {
		if (!visible) {
			setShowFragments(false);
			return;
		}
		const timer = setTimeout(() => {
			resumeRef.current?.focus();
		}, 80);
		return () => clearTimeout(timer);
	}, [visible]);

	if (!visible) return null;

	const handleSave = () => {
		if (!onSave) return;
		setSaving(true);
		setTimeout(() => {
			onSave();
			setSaving(false);
			pushToast("Game saved", "success");
		}, 0);
	};

	if (showFragments) {
		return (
			<div
				data-testid="pause-menu"
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "rgba(2, 5, 10, 0.82)",
					zIndex: 100,
					backdropFilter: "blur(6px)",
				}}
				role="dialog"
				aria-label="Memory Log"
				aria-modal={true}
			>
				<FragmentLog onBack={() => setShowFragments(false)} />
			</div>
		);
	}

	const progress = getFragmentProgress();

	return (
		<div
			data-testid="pause-menu"
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(2, 5, 10, 0.82)",
				zIndex: 100,
				backdropFilter: "blur(6px)",
			}}
			role="dialog"
			aria-label="Pause Menu"
			aria-modal={true}
		>
			<div
				style={{
					width: "100%",
					maxWidth: 360,
					borderRadius: 20,
					border: "1px solid rgba(139, 230, 255, 0.2)",
					backgroundColor: "rgba(6, 17, 26, 0.96)",
					paddingLeft: 20,
					paddingRight: 20,
					paddingTop: 24,
					paddingBottom: 24,
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
					display: "flex",
					flexDirection: "column",
					gap: 4,
				}}
			>
				{/* Header */}
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						letterSpacing: "4px",
						textTransform: "uppercase",
						color: "rgba(139, 230, 255, 0.6)",
						marginBottom: 16,
						textAlign: "center",
						display: "block",
					}}
				>
					System Paused
				</span>

				{/* Menu items */}
				<PauseButton
					ref={resumeRef}
					label="Resume"
					tone="primary"
					onClick={onResume}
					data-testid="pause-resume"
				/>
				<PauseButton
					label={`Memory Log (${progress.read}/${progress.total})`}
					tone="default"
					onClick={() => setShowFragments(true)}
					data-testid="pause-fragments"
				/>
				{onSave && (
					<PauseButton
						label={saving ? "Syncing..." : "Persistence Sync"}
						tone="default"
						onClick={handleSave}
						disabled={saving}
						data-testid="pause-save"
					/>
				)}
				<PauseButton
					label="Disconnect"
					tone="danger"
					onClick={onQuitToTitle}
					data-testid="pause-quit"
				/>
			</div>
		</div>
	);
}

// ─── PauseButton ─────────────────────────────────────────────────────────────

type PauseButtonTone = "primary" | "default" | "danger";

const TONE_STYLES: Record<
	PauseButtonTone,
	{ borderColor: string; bgColor: string; textColor: string }
> = {
	primary: {
		borderColor: "rgba(139, 230, 255, 0.5)",
		bgColor: "rgba(139, 230, 255, 0.12)",
		textColor: "#8be6ff",
	},
	default: {
		borderColor: "rgba(255, 255, 255, 0.12)",
		bgColor: "rgba(255, 255, 255, 0.04)",
		textColor: "rgba(255, 255, 255, 0.7)",
	},
	danger: {
		borderColor: "rgba(255, 143, 143, 0.3)",
		bgColor: "rgba(255, 143, 143, 0.06)",
		textColor: "#ff8f8f",
	},
};

const PauseButton = ({
	ref,
	label,
	tone,
	onClick,
	disabled,
	"data-testid": testId,
}: {
	ref?: React.Ref<HTMLButtonElement>;
	label: string;
	tone: PauseButtonTone;
	onClick: () => void;
	disabled?: boolean;
	"data-testid"?: string;
}) => {
	const colors = TONE_STYLES[tone];
	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			data-testid={testId}
			style={{
				minHeight: 48,
				borderRadius: 12,
				borderWidth: 1.5,
				borderStyle: "solid",
				borderColor: colors.borderColor,
				backgroundColor: colors.bgColor,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				paddingLeft: 16,
				paddingRight: 16,
				paddingTop: 12,
				paddingBottom: 12,
				opacity: disabled ? 0.5 : 1,
				cursor: disabled ? "not-allowed" : "pointer",
				width: "100%",
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					letterSpacing: "3px",
					textTransform: "uppercase",
					fontWeight: 700,
					color: colors.textColor,
				}}
			>
				{label}
			</span>
		</button>
	);
};

// ─── FragmentLog ─────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
	common: "rgba(255,255,255,0.5)",
	uncommon: "#8be6ff",
	rare: "#b088d8",
	legendary: "#f6c56a",
};

function FragmentLog({ onBack }: { onBack: () => void }) {
	const fragments = getReadFragments();
	const progress = getFragmentProgress();

	return (
		<div
			data-testid="fragment-log"
			style={{
				width: "100%",
				maxWidth: 480,
				maxHeight: "70vh",
				borderRadius: 20,
				border: "1px solid rgba(139, 230, 255, 0.2)",
				backgroundColor: "rgba(6, 17, 26, 0.96)",
				padding: 20,
				boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
				display: "flex",
				flexDirection: "column",
				gap: 12,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						letterSpacing: "4px",
						textTransform: "uppercase",
						color: "rgba(139, 230, 255, 0.6)",
					}}
				>
					Memory Log
				</span>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						color: "rgba(255,255,255,0.4)",
					}}
				>
					{progress.read}/{progress.total} RECOVERED
				</span>
			</div>
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				{fragments.length === 0 && (
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 11,
							color: "rgba(255,255,255,0.3)",
							textAlign: "center",
							padding: 20,
						}}
					>
						NO FRAGMENTS RECOVERED
					</span>
				)}
				{fragments.map((f) => (
					<FragmentCard key={f.id} fragment={f} />
				))}
			</div>
			<PauseButton
				label="Back"
				tone="default"
				onClick={onBack}
				data-testid="fragment-log-back"
			/>
		</div>
	);
}

function FragmentCard({ fragment }: { fragment: FragmentDefinition }) {
	const rarityColor = RARITY_COLORS[fragment.rarity] ?? "rgba(255,255,255,0.5)";
	return (
		<div
			style={{
				borderRadius: 8,
				border: `1px solid ${rarityColor}33`,
				backgroundColor: "rgba(255,255,255,0.03)",
				padding: "10px 12px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginBottom: 4,
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						fontWeight: 700,
						color: rarityColor,
						letterSpacing: 1,
						textTransform: "uppercase",
					}}
				>
					{fragment.title}
				</span>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 8,
						color: rarityColor,
						letterSpacing: 1,
						textTransform: "uppercase",
						opacity: 0.6,
					}}
				>
					{fragment.rarity}
				</span>
			</div>
			<p
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: "rgba(255,255,255,0.65)",
					lineHeight: "16px",
					margin: 0,
				}}
			>
				{fragment.text}
			</p>
		</div>
	);
}
