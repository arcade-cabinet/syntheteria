/**
 * Minimal DOM Game HUD for Vite/Capacitor (no React Native).
 * Shows turn, resources, storm, and Quit. Full HUD is in panels/GameHUD (RN).
 */
import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { getTurnState } from "../../systems/turnSystem";

const panelStyle: React.CSSProperties = {
	position: "absolute",
	left: 0,
	top: 0,
	width: "100%",
	paddingTop: 8,
	pointerEvents: "none",
	display: "flex",
	justifyContent: "space-between",
	alignItems: "flex-start",
	paddingLeft: 12,
	paddingRight: 12,
};
const chipStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	padding: "4px 8px",
	borderRadius: 8,
	background: "rgba(7, 17, 23, 0.9)",
	color: "#fff",
	fontFamily: "monospace",
	fontSize: 12,
};
const btnStyle: React.CSSProperties = {
	pointerEvents: "auto",
	padding: "6px 12px",
	borderRadius: 8,
	background: "#1a3a4a",
	color: "#8be6ff",
	border: "1px solid #2a5a6a",
	fontSize: 12,
	cursor: "pointer",
};

export function GameHUDDom({ onQuit }: { onQuit: () => void }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const turn = getTurnState();

	return (
		<div style={panelStyle}>
			<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
				<div style={chipStyle}>
					<span
						style={{
							color: "rgba(255,255,255,0.5)",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
						}}
					>
						Turn
					</span>
					<span style={{ color: "#d9fff3" }}>{turn.turnNumber}</span>
				</div>
				<div style={chipStyle}>
					<span
						style={{
							color: "rgba(255,255,255,0.5)",
							textTransform: "uppercase",
						}}
					>
						Day
					</span>
					<span style={{ color: "#ffe9b0" }}>{snap.weather.phase}</span>
				</div>
				<div style={chipStyle}>
					<span
						style={{
							color: "rgba(255,255,255,0.5)",
							textTransform: "uppercase",
						}}
					>
						Scrap
					</span>
					<span style={{ color: "#7ee7cb" }}>{snap.resources.scrapMetal}</span>
				</div>
				<div style={chipStyle}>
					<span
						style={{
							color: "rgba(255,255,255,0.5)",
							textTransform: "uppercase",
						}}
					>
						Storm
					</span>
					<span style={{ color: "#f6c56a" }}>
						{(snap.power.stormIntensity * 100).toFixed(0)}%
					</span>
				</div>
			</div>
			<button type="button" style={btnStyle} onClick={onQuit}>
				Quit to title
			</button>
		</div>
	);
}
