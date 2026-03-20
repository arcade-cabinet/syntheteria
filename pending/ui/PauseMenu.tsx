/**
 * PauseMenu — overlay that pauses the game loop and offers:
 *   - Resume
 *   - Save Game
 *   - Settings (placeholder — wires to existing SettingsOverlay)
 *   - Quit to Title
 *
 * Rendered as a semi-transparent overlay over the game canvas.
 * All gameplay input is blocked while the pause menu is open.
 * Styled to match the machine-perception HUD language.
 */

import { useEffect, useRef, useState } from "react";
import { saveAllStateSync } from "../db/saveAllState";
import { pushToast } from "../systems/toastStore";
import { SettingsScreen } from "./SettingsScreen";

export interface PauseMenuProps {
	visible: boolean;
	onResume: () => void;
	onQuitToTitle: () => void;
}

export function PauseMenu({
	visible,
	onResume,
	onQuitToTitle,
}: PauseMenuProps) {
	const resumeRef = useRef<HTMLButtonElement>(null);
	const [saving, setSaving] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	useEffect(() => {
		if (!visible) return;
		const timer = setTimeout(() => {
			resumeRef.current?.focus();
		}, 80);
		return () => clearTimeout(timer);
	}, [visible]);

	if (!visible) return null;

	const handleSave = () => {
		setSaving(true);
		// Use setTimeout(0) to let the UI render the "saving" state
		setTimeout(() => {
			const result = saveAllStateSync();
			setSaving(false);
			if (result.success) {
				pushToast(`Saved — Turn ${result.turnNumber}`, "success");
			} else {
				pushToast(`Save failed: ${result.error}`, "error");
			}
		}, 0);
	};

	return (
		<div
			className="absolute inset-0 flex items-center justify-center"
			style={{
				backgroundColor: "rgba(2, 5, 10, 0.82)",
				zIndex: 100,
				backdropFilter: "blur(6px)",
			}}
			role="dialog"
			aria-label="Pause Menu"
			aria-modal={true}
		>
			<div
				className="w-full max-w-[360px] rounded-[20px] border border-[#8be6ff]/20 bg-[#06111a]/96 px-5 py-6 shadow-2xl flex flex-col"
				style={{ gap: 4 }}
			>
				{/* Header */}
				<span
					className="font-mono text-center block"
					style={{
						fontSize: 10,
						letterSpacing: "4px",
						textTransform: "uppercase",
						color: "rgba(139, 230, 255, 0.6)",
						marginBottom: 16,
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
					label={saving ? "Saving..." : "Save Game"}
					tone="default"
					onClick={handleSave}
					disabled={saving}
					data-testid="pause-save"
				/>
				<PauseButton
					label="Settings"
					tone="default"
					onClick={() => setShowSettings(true)}
					data-testid="pause-settings"
				/>
				<PauseButton
					label="Quit to Title"
					tone="danger"
					onClick={onQuitToTitle}
					data-testid="pause-quit"
				/>
			</div>

			<SettingsScreen
				visible={showSettings}
				onClose={() => setShowSettings(false)}
			/>
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
