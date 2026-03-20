/**
 * Command bar — RESEARCH / GARAGE / ROSTER / DIPLOMACY toggle buttons.
 */

type PanelKey = "techTree" | "garage" | "roster" | "diplomacy";

interface CommandBarProps {
	showTechTree: boolean;
	showGarage: boolean;
	showRoster: boolean;
	showDiplomacy: boolean;
	onToggle: (key: PanelKey | null) => void;
}

const BUTTONS: { label: string; key: PanelKey }[] = [
	{ label: "Research", key: "techTree" },
	{ label: "Garage", key: "garage" },
	{ label: "Roster", key: "roster" },
	{ label: "Diplomacy", key: "diplomacy" },
];

export function CommandBar({
	showTechTree,
	showGarage,
	showRoster,
	showDiplomacy,
	onToggle,
}: CommandBarProps) {
	const activeMap: Record<PanelKey, boolean> = {
		techTree: showTechTree,
		garage: showGarage,
		roster: showRoster,
		diplomacy: showDiplomacy,
	};

	return (
		<div
			data-testid="command-bar"
			style={{
				position: "absolute",
				top: 12,
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				gap: 6,
				zIndex: 40,
				pointerEvents: "auto",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				background: "rgba(3,3,8,0.7)",
				padding: "6px 10px",
				borderRadius: 8,
				backdropFilter: "blur(6px)",
			}}
		>
			{BUTTONS.map(({ label, key }) => {
				const active = activeMap[key];
				return (
					<button
						key={key}
						type="button"
						data-testid={`cmd-${key}`}
						onClick={() => onToggle(active ? null : key)}
						style={{
							padding: "6px 14px",
							background: active ? "rgba(139,230,255,0.12)" : "rgba(3,3,8,0.7)",
							border: `1px solid ${active ? "rgba(139,230,255,0.5)" : "rgba(139,230,255,0.2)"}`,
							borderRadius: 5,
							color: active ? "#8be6ff" : "rgba(139,230,255,0.6)",
							fontSize: 10,
							letterSpacing: "0.18em",
							textTransform: "uppercase",
							cursor: "pointer",
							fontFamily: "inherit",
						}}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}
