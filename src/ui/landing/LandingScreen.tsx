/**
 * LandingScreen — DOM overlay for the title menu.
 *
 * No longer owns a Canvas — the globe is rendered by the persistent
 * Globe component in main.tsx. This component provides:
 *   1. TitleMenuOverlay — HTML overlay (wordmark, bezel arc, image buttons)
 *   2. NewGameModal / SaveListModal / SettingsModal — overlays
 */

import { useState } from "react";
import type { GameSummary } from "../../db";
import type { NewGameConfig } from "../../world/config";
import { NewGameModal } from "./NewGameModal";
import { SettingsModal } from "./SettingsModal";
import { TitleMenuOverlay } from "./title/TitleMenuOverlay";

type LandingScreenProps = {
	onStartGame: (config: NewGameConfig) => void;
	onLoadGame?: (gameId: string) => void;
	savedGames?: GameSummary[];
};

type Modal = "none" | "new" | "load" | "settings";

export function LandingScreen({
	onStartGame,
	onLoadGame,
	savedGames = [],
}: LandingScreenProps) {
	const [modal, setModal] = useState<Modal>("none");

	return (
		<div
			data-testid="landing-screen"
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				pointerEvents: "none",
			}}
		>
			{/* HTML overlay — wordmark + bezel + buttons */}
			<TitleMenuOverlay
				hasSaveGame={savedGames.length > 0}
				onNewGame={() => setModal("new")}
				onContinueGame={() => setModal("load")}
				onSettings={() => setModal("settings")}
			/>

			{/* Modals */}
			{modal === "new" && (
				<NewGameModal
					onStart={(config) => {
						setModal("none");
						onStartGame(config);
					}}
					onCancel={() => setModal("none")}
				/>
			)}

			{modal === "load" && onLoadGame && (
				<SaveListModal
					saves={savedGames}
					onLoad={(id) => {
						setModal("none");
						onLoadGame(id);
					}}
					onCancel={() => setModal("none")}
				/>
			)}

			<SettingsModal
				visible={modal === "settings"}
				onClose={() => setModal("none")}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Save list modal
// ---------------------------------------------------------------------------

function SaveListModal({
	saves,
	onLoad,
	onCancel,
}: {
	saves: GameSummary[];
	onLoad: (gameId: string) => void;
	onCancel: () => void;
}) {
	return (
		<div
			data-testid="save-list-modal"
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(3,3,8,0.85)",
				zIndex: 20,
				pointerEvents: "auto",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 16,
					padding: "32px 40px",
					border: "1px solid rgba(139,230,255,0.3)",
					borderRadius: 8,
					background: "#070c18",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					color: "#8be6ff",
					minWidth: 340,
					maxWidth: 480,
				}}
			>
				<h2
					style={{
						margin: 0,
						fontSize: 14,
						letterSpacing: "0.25em",
						textTransform: "uppercase",
					}}
				>
					Saved Games
				</h2>

				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{saves.map((s) => (
						<button
							key={s.id}
							type="button"
							data-testid={`save-row-${s.id}`}
							onClick={() => onLoad(s.id)}
							style={saveRowStyle}
						>
							<span style={{ color: "#8be6ff" }}>
								{s.boardW}×{s.boardH} · {s.difficulty} · turn {s.turn}
							</span>
							<span style={{ color: "rgba(139,230,255,0.45)", fontSize: 11 }}>
								{s.seed} · {formatDate(s.createdAt)}
							</span>
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={onCancel}
					style={{ ...cancelBtnStyle, marginTop: 4, alignSelf: "flex-start" }}
				>
					Back
				</button>
			</div>
		</div>
	);
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	} catch {
		return iso;
	}
}

const saveRowStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 4,
	padding: "10px 14px",
	background: "transparent",
	border: "1px solid rgba(139,230,255,0.2)",
	borderRadius: 4,
	color: "inherit",
	fontFamily: "inherit",
	fontSize: 13,
	textAlign: "left",
	cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
	background: "transparent",
	border: "none",
	color: "rgba(139,230,255,0.4)",
	fontFamily: "inherit",
	fontSize: 12,
	letterSpacing: "0.15em",
	textTransform: "uppercase",
	cursor: "pointer",
	padding: "4px 0",
};
