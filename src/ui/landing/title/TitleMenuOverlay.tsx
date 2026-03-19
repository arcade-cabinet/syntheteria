/**
 * TitleMenuOverlay — 2D HTML overlay for the title menu.
 *
 * Layers on top of the live 3D TitleMenuScene Canvas:
 *   - Accessible title label (visible title is 3D text on the globe)
 *   - Curved SVG bezel arc at the bottom
 *   - Three menu buttons using the brand WebP button art
 *   - CSS transitions for entrance + hover states
 *
 * Brand assets:
 *   /assets/ui/buttons/new_game.webp    — 768×260 button art
 *   /assets/ui/buttons/load_game.webp   — 768×256 button art
 *   /assets/ui/buttons/settings.webp    — 768×256 button art
 */

import { useCallback, useEffect, useState } from "react";
import { initAudio, startAmbience } from "../../../audio";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TitleMenuOverlayProps {
	hasSaveGame: boolean;
	onNewGame: () => void;
	onContinueGame: () => void;
	onSettings: () => void;
}

// ─── Accessible Title Label ──────────────────────────────────────────────────
// The visible title is rendered as 3D text on the globe in TitleMenuScene.
// This hidden element provides the accessible label for screen readers.

function TitleA11yLabel() {
	return (
		<div
			data-testid="title-logo"
			aria-label="Syntheteria"
			role="heading"
			aria-level={1}
			style={{
				position: "absolute",
				width: 1,
				height: 1,
				overflow: "hidden",
				clip: "rect(0, 0, 0, 0)",
				whiteSpace: "nowrap",
			}}
		>
			Syntheteria
		</div>
	);
}

// ─── Button ───────────────────────────────────────────────────────────────────

function MenuImageButton({
	imageUri,
	imageWidth,
	imageHeight,
	label,
	disabled = false,
	onPress,
	testID,
}: {
	imageUri: string;
	imageWidth: number;
	imageHeight: number;
	label: string;
	disabled?: boolean;
	onPress?: () => void;
	testID?: string;
}) {
	// Display size: cap at 320px wide
	const maxW = 320;
	const displayW = Math.min(imageWidth, maxW);
	const displayH = Math.round(displayW * (imageHeight / imageWidth));

	return (
		<button
			onClick={disabled ? undefined : onPress}
			disabled={disabled}
			role="button"
			aria-label={label}
			aria-disabled={disabled}
			data-testid={testID}
			className="transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-40"
			style={{ opacity: disabled ? 0.4 : 0.85 }}
		>
			<img
				src={imageUri}
				alt={label}
				style={{ width: displayW, height: displayH, objectFit: "contain" }}
			/>
		</button>
	);
}

// ─── Curved Bezel Arc ────────────────────────────────────────────────────────

function BezelArc({ width, height }: { width: number; height: number }) {
	const viewBoxW = 1200;
	const viewBoxH = 200;

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
			xmlns="http://www.w3.org/2000/svg"
			style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
		>
			<defs>
				<linearGradient id="bezelFill" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="rgba(6, 17, 26, 0.75)" />
					<stop offset="100%" stopColor="rgba(3, 7, 13, 0.92)" />
				</linearGradient>
			</defs>

			{/* Filled bezel body */}
			<path
				d={`M 0,${viewBoxH} L 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120 L ${viewBoxW},${viewBoxH} Z`}
				fill="url(#bezelFill)"
			/>

			{/* Outer glow border */}
			<path
				d={`M 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.35)"
				strokeWidth="2"
			/>

			{/* Inner accent line */}
			<path
				d={`M 50,125 Q ${viewBoxW / 2},30 ${viewBoxW - 50},125`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.15)"
				strokeWidth="1"
			/>
		</svg>
	);
}

// ─── Main Overlay ────────────────────────────────────────────────────────────

export function TitleMenuOverlay({
	hasSaveGame,
	onNewGame,
	onContinueGame,
	onSettings,
}: TitleMenuOverlayProps) {
	const [vw, setVw] = useState(window.innerWidth);
	const [vh, setVh] = useState(window.innerHeight);
	const [entered, setEntered] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			setVw(window.innerWidth);
			setVh(window.innerHeight);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const isWide = vw >= 768;
	const bezelHeight = Math.min(vh * 0.3, 200);

	// Wrap button handlers to init audio on first user gesture (browser autoplay policy).
	// Audio is non-fatal — catch errors so the game still works without sound.
	const initAudioSafe = useCallback(() => {
		initAudio()
			.then(startAmbience)
			.catch((err) => {
				console.warn("[audio] Init failed (non-fatal):", err);
			});
	}, []);
	const handleNewGame = useCallback(() => {
		initAudioSafe();
		onNewGame();
	}, [onNewGame, initAudioSafe]);
	const handleContinue = useCallback(() => {
		initAudioSafe();
		onContinueGame();
	}, [onContinueGame, initAudioSafe]);
	const handleSettings = useCallback(() => {
		initAudioSafe();
		onSettings();
	}, [onSettings, initAudioSafe]);

	// Staggered entrance animation
	useEffect(() => {
		const timer = setTimeout(() => {
			setEntered(true);
		}, 600);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="absolute inset-0" style={{ pointerEvents: "none" }}>
			{/* A11y label — visible title is 3D text in TitleMenuScene */}
			<TitleA11yLabel />

			{/* Bottom bezel zone */}
			<div
				className="absolute bottom-0 left-0 right-0"
				style={{ height: bezelHeight, pointerEvents: "none" }}
			>
				{/* SVG arc background */}
				<BezelArc width={vw} height={bezelHeight} />

				{/* Buttons along the arc — entrance animation via CSS */}
				<div
					className="absolute bottom-0 left-0 right-0 flex items-end justify-center transition-all duration-700"
					style={{
						height: bezelHeight,
						paddingBottom: Math.max(bezelHeight * 0.08, 8),
						opacity: entered ? 1 : 0,
						transform: entered ? "translateY(0)" : "translateY(30px)",
						pointerEvents: "none",
					}}
				>
					<div
						className={`w-full ${isWide ? "flex flex-row" : "flex flex-col"} items-end justify-center`}
						style={{
							gap: isWide ? Math.max(vw * 0.03, 20) : 8,
							paddingLeft: vw * 0.05,
							paddingRight: vw * 0.05,
							maxWidth: 1200,
							pointerEvents: "auto",
						}}
					>
						{/* New Game — left arc */}
						<div
							style={isWide ? { marginBottom: bezelHeight * 0.22 } : undefined}
						>
							<MenuImageButton
								imageUri="/assets/ui/buttons/new_game.webp"
								imageWidth={768}
								imageHeight={260}
								label="New Game"
								onPress={handleNewGame}
								testID="title-new_game"
							/>
						</div>

						{/* Continue — center apex */}
						{hasSaveGame && (
							<div
								style={
									isWide ? { marginBottom: bezelHeight * 0.35 } : undefined
								}
							>
								<MenuImageButton
									imageUri="/assets/ui/buttons/load_game.webp"
									imageWidth={768}
									imageHeight={256}
									label="Continue"
									onPress={handleContinue}
									testID="title-load_game"
								/>
							</div>
						)}

						{/* Calibration — right arc */}
						<div
							style={isWide ? { marginBottom: bezelHeight * 0.22 } : undefined}
						>
							<MenuImageButton
								imageUri="/assets/ui/buttons/settings.webp"
								imageWidth={768}
								imageHeight={256}
								label="Calibration"
								onPress={handleSettings}
								testID="title-settings"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
