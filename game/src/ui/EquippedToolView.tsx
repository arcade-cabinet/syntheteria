/**
 * Equipped tool "held" view — bottom center of viewport.
 *
 * Shows a procedurally generated representation of the currently
 * equipped tool, like a first-person weapon/tool view.
 * Tapping it opens the radial tool menu.
 *
 * Also includes action buttons on the right side for mobile.
 */

import { useEffect, useState } from "react";
import {
	getEquippedTool,
	subscribeToolChange,
	type ToolType,
} from "./RadialToolMenu";

const TOOL_VISUALS: Record<
	ToolType,
	{ color: string; shape: string; label: string }
> = {
	scanner: { color: "#00ffaa", shape: "◎", label: "SCANNER" },
	repair: { color: "#44aaff", shape: "⚙", label: "REPAIR ARM" },
	welder: { color: "#ffaa00", shape: "⚡", label: "WELDER" },
	fabricate: { color: "#aa44ff", shape: "⬡", label: "FABRICATOR" },
	build: { color: "#44ff88", shape: "▦", label: "BUILDER" },
	scavenge: { color: "#ff8844", shape: "◈", label: "SALVAGER" },
};

interface EquippedToolViewProps {
	onTap: () => void;
}

export function EquippedToolView({ onTap }: EquippedToolViewProps) {
	const [tool, setTool] = useState(getEquippedTool());

	useEffect(() => {
		return subscribeToolChange(() => setTool(getEquippedTool()));
	}, []);

	const visual = TOOL_VISUALS[tool];

	return (
		<div
			onClick={onTap}
			style={{
				position: "absolute",
				bottom: "8px",
				left: "50%",
				transform: "translateX(-50%)",
				width: "80px",
				height: "80px",
				borderRadius: "50%",
				background: "rgba(0, 8, 4, 0.8)",
				border: `2px solid ${visual.color}44`,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				pointerEvents: "auto",
				boxShadow: `0 0 16px ${visual.color}22, inset 0 0 12px ${visual.color}11`,
				zIndex: 20,
			}}
		>
			<span style={{ fontSize: "28px", lineHeight: 1 }}>{visual.shape}</span>
			<span
				style={{
					color: visual.color,
					fontSize: "7px",
					fontFamily: "'Courier New', monospace",
					letterSpacing: "0.1em",
					marginTop: "2px",
				}}
			>
				{visual.label}
			</span>
		</div>
	);
}

/**
 * Right-side action buttons for mobile FPS.
 * Primary action (use tool) + secondary (interact/switch bot).
 */
export function ActionButtons({
	onPrimaryAction,
	onInteract,
	onSwitchBot,
}: {
	onPrimaryAction: () => void;
	onInteract: () => void;
	onSwitchBot: () => void;
}) {
	return (
		<div
			style={{
				position: "absolute",
				right: "12px",
				bottom: "20px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				pointerEvents: "auto",
				zIndex: 20,
			}}
		>
			{/* Primary action — large button */}
			<ActionBtn
				label="USE"
				color="#00ffaa"
				size={56}
				onPress={onPrimaryAction}
			/>
			{/* Interact */}
			<ActionBtn label="E" color="#44aaff" size={44} onPress={onInteract} />
			{/* Switch bot */}
			<ActionBtn label="Q" color="#ffaa44" size={44} onPress={onSwitchBot} />
		</div>
	);
}

function ActionBtn({
	label,
	color,
	size,
	onPress,
}: {
	label: string;
	color: string;
	size: number;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			onPointerDown={(e) => {
				e.preventDefault();
				onPress();
			}}
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				background: "rgba(0, 8, 4, 0.7)",
				border: `2px solid ${color}66`,
				color,
				fontSize: size > 50 ? "13px" : "11px",
				fontFamily: "'Courier New', monospace",
				fontWeight: "bold",
				letterSpacing: "0.05em",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				boxShadow: `0 0 8px ${color}22`,
			}}
		>
			{label}
		</button>
	);
}
