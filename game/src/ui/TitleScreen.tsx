/**
 * Main title screen — "SYNTHETERIA" in large text with seed phrase and New Game.
 *
 * Every world has a three-word seed phrase (adj-adj-noun) derived from a
 * 32-bit numeric seed.  A random phrase is generated on first load.
 * The player can type a different phrase (or a raw number) to reproduce
 * a specific world — like entering a Minecraft seed.
 *
 * The phrase is passed to onNewGame() so App can set the world seed before
 * initialising the game.
 */
import { useEffect, useRef, useState } from "react";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import { getSaveSlots, loadGame, type SaveSlotInfo } from "../save/SaveManager";

export function TitleScreen({
	onNewGame,
	onContinue,
}: {
	onNewGame: (seed: number) => void;
	onContinue?: () => void;
}) {
	const [titleOpacity, setTitleOpacity] = useState(0);
	const [menuOpacity, setMenuOpacity] = useState(0);
	const [glitch, setGlitch] = useState(false);
	const [latestSave, setLatestSave] = useState<SaveSlotInfo | null>(null);

	// Seed state — one random seed at startup, shown as a phrase
	const [phraseInput, setPhraseInput] = useState(() =>
		seedToPhrase(randomSeed()),
	);
	const [parseError, setParseError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// Check for existing saves to enable CONTINUE button
	useEffect(() => {
		getSaveSlots()
			.then((slots) => {
				if (slots.length > 0) {
					// Sort by most recently updated
					const sorted = [...slots].sort(
						(a, b) => b.updatedAt - a.updatedAt,
					);
					setLatestSave(sorted[0]);
				}
			})
			.catch(() => {
				// No saves or error — leave CONTINUE disabled
			});
	}, []);

	useEffect(() => {
		const t1 = setTimeout(() => setTitleOpacity(1), 200);
		const t2 = setTimeout(() => setMenuOpacity(1), 1200);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, []);

	// Periodic glitch effect on title
	useEffect(() => {
		const interval = setInterval(
			() => {
				setGlitch(true);
				setTimeout(() => setGlitch(false), 100 + Math.random() * 150);
			},
			3000 + Math.random() * 4000,
		);
		return () => clearInterval(interval);
	}, []);

	const handleNewGame = () => {
		const parsed = phraseToSeed(phraseInput);
		if (parsed === null) {
			setParseError(true);
			inputRef.current?.focus();
			return;
		}
		setParseError(false);
		onNewGame(parsed);
	};

	const handlePhraseChange = (val: string) => {
		setPhraseInput(val);
		setParseError(false);
	};

	const shuffleSeed = () => {
		const s = randomSeed();
		setPhraseInput(seedToPhrase(s));
		setParseError(false);
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "#000",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 200,
			}}
		>
			{/* Scanline overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.03) 2px, rgba(0,255,170,0.03) 4px)",
					pointerEvents: "none",
				}}
			/>

			{/* Title */}
			<div
				style={{
					opacity: titleOpacity,
					transition: "opacity 1.5s ease-in-out",
					fontFamily: "'Courier New', monospace",
					fontSize: "clamp(32px, 8vw, 72px)",
					fontWeight: "bold",
					letterSpacing: "0.3em",
					color: "#00ffaa",
					textShadow: glitch
						? "3px 0 #ff0044, -3px 0 #0044ff, 0 0 40px rgba(0,255,170,0.6)"
						: "0 0 40px rgba(0,255,170,0.4), 0 0 80px rgba(0,255,170,0.15), 0 0 2px #00ffaa",
					transform: glitch
						? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px)`
						: "none",
					userSelect: "none",
					textAlign: "center",
					padding: "0 16px",
				}}
			>
				SYNTHETERIA
			</div>

			{/* Subtitle */}
			<div
				style={{
					opacity: titleOpacity * 0.6,
					transition: "opacity 2s ease-in-out",
					fontFamily: "'Courier New', monospace",
					fontSize: "clamp(11px, 2vw, 16px)",
					color: "#00ffaa",
					letterSpacing: "0.5em",
					marginTop: "12px",
					textShadow: "0 0 20px rgba(0,255,170,0.3)",
					textAlign: "center",
				}}
			>
				AWAKEN // CONNECT // REBUILD
			</div>

			{/* Menu */}
			<div
				style={{
					marginTop: "clamp(32px, 6vh, 64px)",
					opacity: menuOpacity,
					transition: "opacity 1s ease-in-out",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "12px",
					width: "min(320px, 88vw)",
				}}
			>
				{/* World seed input */}
				<div style={{ width: "100%" }}>
					<div
						style={{
							fontFamily: "'Courier New', monospace",
							fontSize: "clamp(10px, 2.5vw, 12px)",
							color: "rgba(0,255,170,0.5)",
							letterSpacing: "0.2em",
							marginBottom: "6px",
							textAlign: "center",
						}}
					>
						WORLD SEED
					</div>
					<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
						<input
							ref={inputRef}
							value={phraseInput}
							onChange={(e) => handlePhraseChange(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleNewGame()}
							spellCheck={false}
							autoComplete="off"
							style={{
								flex: 1,
								background: "rgba(0,255,170,0.05)",
								border: parseError
									? "1px solid #ff4444"
									: "1px solid rgba(0,255,170,0.35)",
								borderRadius: "4px",
								color: parseError ? "#ff8866" : "#00ffaa",
								fontFamily: "'Courier New', monospace",
								fontSize: "clamp(12px, 3vw, 14px)",
								padding: "8px 10px",
								letterSpacing: "0.05em",
								outline: "none",
								width: "100%",
								textAlign: "center",
								caretColor: "#00ffaa",
							}}
							placeholder="hollow-bright-forge"
						/>
						{/* Shuffle button */}
						<button
							onClick={shuffleSeed}
							title="Random seed"
							style={{
								background: "rgba(0,255,170,0.07)",
								border: "1px solid rgba(0,255,170,0.3)",
								borderRadius: "4px",
								color: "#00ffaa",
								fontFamily: "'Courier New', monospace",
								fontSize: "16px",
								padding: "8px 10px",
								cursor: "pointer",
								flexShrink: 0,
								lineHeight: 1,
							}}
						>
							⟳
						</button>
					</div>
					{parseError && (
						<div
							style={{
								color: "#ff6644",
								fontFamily: "'Courier New', monospace",
								fontSize: "11px",
								marginTop: "4px",
								textAlign: "center",
							}}
						>
							unrecognised seed — use adj-adj-noun or a number
						</div>
					)}
				</div>

				<MenuButton label="NEW GAME" onClick={handleNewGame} primary />
				<MenuButton
					label="CONTINUE"
					disabled={!latestSave}
					onClick={
						latestSave
							? () => {
									loadGame(latestSave.slotId)
										.then(() => onContinue?.())
										.catch((err) =>
											console.error("[Continue] Load failed:", err),
										);
								}
							: undefined
					}
				/>
				<MenuButton label="SETTINGS" disabled />
			</div>

			{/* Version */}
			<div
				style={{
					position: "absolute",
					bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
					fontFamily: "'Courier New', monospace",
					fontSize: "11px",
					color: "rgba(0,255,170,0.3)",
					letterSpacing: "0.15em",
				}}
			>
				v0.1.0 — PHASE 1 PROTOTYPE
			</div>
		</div>
	);
}

function MenuButton({
	label,
	onClick,
	primary,
	disabled,
}: {
	label: string;
	onClick?: () => void;
	primary?: boolean;
	disabled?: boolean;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			style={{
				background: disabled
					? "transparent"
					: hovered
						? "rgba(0,255,170,0.15)"
						: "transparent",
				color: disabled ? "rgba(0,255,170,0.25)" : "#00ffaa",
				border: disabled
					? "1px solid rgba(0,255,170,0.15)"
					: primary && hovered
						? "1px solid #00ffaa"
						: "1px solid rgba(0,255,170,0.4)",
				borderRadius: "4px",
				padding: "12px 0",
				fontSize: "clamp(14px, 3.5vw, 16px)",
				fontFamily: "'Courier New', monospace",
				letterSpacing: "0.2em",
				cursor: disabled ? "default" : "pointer",
				width: "100%",
				transition: "all 0.2s ease",
				textShadow: disabled
					? "none"
					: hovered
						? "0 0 10px rgba(0,255,170,0.5)"
						: "none",
				boxShadow:
					primary && hovered
						? "0 0 20px rgba(0,255,170,0.2), inset 0 0 20px rgba(0,255,170,0.05)"
						: "none",
				minHeight: "48px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
