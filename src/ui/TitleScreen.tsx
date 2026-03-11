/**
 * Main title screen — "SYNTHETERIA" with factory planet identity.
 *
 * Industrial mechanical aesthetic: chrome panels, amber-orange accents,
 * rust tones. NOT generic terminal green.
 *
 * Every world has a three-word seed phrase (adj-adj-noun) derived from a
 * 32-bit numeric seed. A random phrase is generated on first load.
 * The player can type a different phrase (or a raw number) to reproduce
 * a specific world — like entering a Minecraft seed.
 *
 * The phrase is passed to onNewGame() so App can set the world seed before
 * initialising the game.
 */
import { useEffect, useRef, useState } from "react";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import { getSaveSlots, loadGame, type SaveSlotInfo } from "../save/SaveManager";

// ---------------------------------------------------------------------------
// Design tokens — industrial mechanical, NOT terminal green
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";

/** Primary chrome/amber accent color */
const COLOR_ACCENT = "#e8a020";
/** Secondary dim amber */
const COLOR_ACCENT_DIM = "rgba(232,160,32,0.45)";
/** Muted accent for inactive elements */
const COLOR_ACCENT_MUTED = "rgba(232,160,32,0.22)";
/** Chrome highlight */
const COLOR_CHROME = "#b8c4cc";
/** Error / alert red */
const COLOR_ERROR = "#cc3322";
/** Secondary panel (inset) */
const BG_INSET = "rgba(14,16,20,0.88)";

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
		const t2 = setTimeout(() => setMenuOpacity(1), 1400);
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
				setTimeout(() => setGlitch(false), 80 + Math.random() * 120);
			},
			4000 + Math.random() * 5000,
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
		setPhraseInput(seedToPhrase(randomSeed()));
		setParseError(false);
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "#05070a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 200,
				overflow: "hidden",
			}}
		>
			{/* Rivet grid background — industrial panel texture */}
			<RivetBackground />

			{/* Top edge panel rule */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Bottom edge panel rule */}
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Corner bolts */}
			<Bolt top={12} left={16} />
			<Bolt top={12} right={16} />
			<Bolt bottom={12} left={16} />
			<Bolt bottom={12} right={16} />

			{/* Main content column */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					position: "relative",
					zIndex: 1,
				}}
			>
				{/* Classification banner */}
				<div
					style={{
						opacity: titleOpacity * 0.6,
						transition: "opacity 1s ease-in",
						fontFamily: MONO,
						fontSize: "clamp(9px, 1.8vw, 11px)",
						color: COLOR_ACCENT_DIM,
						letterSpacing: "0.5em",
						marginBottom: "20px",
						textAlign: "center",
						textTransform: "uppercase",
					}}
				>
					// COLONY MISSION BRIEFING //
				</div>

				{/* Horizontal rule */}
				<div
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.2s ease-in",
						width: "clamp(180px, 55vw, 520px)",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, ${COLOR_CHROME}, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginBottom: "18px",
					}}
				/>

				{/* SYNTHETERIA title */}
				<div
					aria-label="Syntheteria"
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.5s ease-in-out",
						fontFamily: MONO,
						fontSize: "clamp(30px, 8vw, 76px)",
						fontWeight: "bold",
						letterSpacing: "0.28em",
						color: COLOR_ACCENT,
						textShadow: glitch
							? `4px 0 ${COLOR_ERROR}, -4px 0 #0044cc, 0 0 40px rgba(232,160,32,0.5)`
							: `0 0 30px rgba(232,160,32,0.35), 0 0 60px rgba(232,160,32,0.12), 0 2px 0 rgba(0,0,0,0.8)`,
						transform: glitch
							? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px) skewX(${Math.random() * 0.5 - 0.25}deg)`
							: "none",
						userSelect: "none",
						textAlign: "center",
						padding: "0 16px",
					}}
				>
					SYNTHETERIA
				</div>

				{/* Factory planet subtitle */}
				<div
					style={{
						opacity: titleOpacity * 0.7,
						transition: "opacity 2s ease-in-out",
						fontFamily: MONO,
						fontSize: "clamp(10px, 2vw, 14px)",
						color: COLOR_CHROME,
						letterSpacing: "0.4em",
						marginTop: "10px",
						textAlign: "center",
						textShadow: `0 0 12px rgba(184,196,204,0.25)`,
					}}
				>
					MACHINE PLANET — SECTOR 7 COLONY OUTPOST
				</div>

				{/* Horizontal rule */}
				<div
					style={{
						opacity: titleOpacity,
						transition: "opacity 1.5s ease-in",
						width: "clamp(180px, 55vw, 520px)",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, ${COLOR_CHROME}, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginTop: "18px",
						marginBottom: "clamp(24px, 5vh, 48px)",
					}}
				/>

				{/* Menu panel */}
				<div
					style={{
						opacity: menuOpacity,
						transition: "opacity 1s ease-in-out",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "10px",
						width: "min(340px, 88vw)",
						background: BG_INSET,
						border: `1px solid ${COLOR_ACCENT_MUTED}`,
						borderRadius: "6px",
						padding: "20px 20px 16px",
					}}
				>
					{/* Seed input section */}
					<SeedInput
						value={phraseInput}
						onChange={handlePhraseChange}
						onShuffle={shuffleSeed}
						onSubmit={handleNewGame}
						hasError={parseError}
						inputRef={inputRef}
					/>

					{/* Divider */}
					<div
						style={{
							width: "100%",
							height: "1px",
							background: COLOR_ACCENT_MUTED,
							margin: "4px 0",
						}}
					/>

					{/* Buttons */}
					<MenuButton
						label="NEW GAME"
						onClick={handleNewGame}
						primary
						aria-label="Start new colony mission"
					/>
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
						aria-label={
							latestSave ? "Continue last colony mission" : "No saved missions"
						}
					/>
					<MenuButton
						label="SETTINGS"
						disabled
						aria-label="Settings — not yet available"
					/>
					<MenuButton
						label="SPECTATE"
						disabled
						aria-label="Spectate mode — not yet available"
					/>
				</div>
			</div>

			{/* Version + build info */}
			<div
				style={{
					position: "absolute",
					bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
					right: "20px",
					fontFamily: MONO,
					fontSize: "10px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.12em",
					textAlign: "right",
				}}
			>
				v0.1.0 — PHASE 1 PROTOTYPE
			</div>

			{/* Status indicator bottom-left */}
			<div
				style={{
					position: "absolute",
					bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
					left: "20px",
					fontFamily: MONO,
					fontSize: "10px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.1em",
					display: "flex",
					alignItems: "center",
					gap: "6px",
				}}
			>
				<div
					style={{
						width: "6px",
						height: "6px",
						borderRadius: "50%",
						background: "#44cc88",
						boxShadow: "0 0 4px #44cc88",
					}}
				/>
				SYSTEMS NOMINAL
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Seed input row
// ---------------------------------------------------------------------------

function SeedInput({
	value,
	onChange,
	onShuffle,
	onSubmit,
	hasError,
	inputRef,
}: {
	value: string;
	onChange: (val: string) => void;
	onShuffle: () => void;
	onSubmit: () => void;
	hasError: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
}) {
	return (
		<div style={{ width: "100%" }}>
			<div
				style={{
					fontFamily: MONO,
					fontSize: "9px",
					color: COLOR_ACCENT_DIM,
					letterSpacing: "0.25em",
					marginBottom: "6px",
					textAlign: "center",
				}}
			>
				MISSION SEED
			</div>
			<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && onSubmit()}
					spellCheck={false}
					autoComplete="off"
					aria-label="Mission seed phrase"
					aria-invalid={hasError}
					style={{
						flex: 1,
						background: "rgba(232,160,32,0.04)",
						border: hasError
							? `1px solid ${COLOR_ERROR}`
							: `1px solid ${COLOR_ACCENT_MUTED}`,
						borderRadius: "3px",
						color: hasError ? "#cc6655" : COLOR_CHROME,
						fontFamily: MONO,
						fontSize: "clamp(11px, 2.8vw, 13px)",
						padding: "8px 10px",
						letterSpacing: "0.04em",
						outline: "none",
						width: "100%",
						textAlign: "center",
						caretColor: COLOR_ACCENT,
					}}
					placeholder="hollow-bright-forge"
				/>
				<button
					onClick={onShuffle}
					title="Generate random mission seed"
					aria-label="Random seed"
					style={{
						background: "rgba(232,160,32,0.06)",
						border: `1px solid ${COLOR_ACCENT_MUTED}`,
						borderRadius: "3px",
						color: COLOR_ACCENT,
						fontFamily: MONO,
						fontSize: "15px",
						padding: "7px 10px",
						cursor: "pointer",
						flexShrink: 0,
						lineHeight: 1,
						minWidth: "36px",
						minHeight: "36px",
					}}
				>
					&#x27F3;
				</button>
			</div>
			{hasError && (
				<div
					role="alert"
					aria-live="assertive"
					style={{
						color: COLOR_ERROR,
						fontFamily: MONO,
						fontSize: "10px",
						marginTop: "4px",
						textAlign: "center",
						letterSpacing: "0.05em",
					}}
				>
					invalid seed — use adj-adj-noun or a number
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Menu button
// ---------------------------------------------------------------------------

function MenuButton({
	label,
	onClick,
	primary,
	disabled,
	"aria-label": ariaLabel,
}: {
	label: string;
	onClick?: () => void;
	primary?: boolean;
	disabled?: boolean;
	"aria-label"?: string;
}) {
	const [hovered, setHovered] = useState(false);

	const bg = disabled
		? "transparent"
		: hovered
			? primary
				? `rgba(232,160,32,0.14)`
				: `rgba(184,196,204,0.07)`
			: "transparent";

	const borderColor = disabled
		? `rgba(232,160,32,0.1)`
		: hovered
			? primary
				? COLOR_ACCENT
				: `rgba(184,196,204,0.5)`
			: primary
				? COLOR_ACCENT_MUTED
				: `rgba(184,196,204,0.2)`;

	const color = disabled
		? `rgba(232,160,32,0.18)`
		: primary
			? COLOR_ACCENT
			: COLOR_CHROME;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			aria-label={ariaLabel}
			style={{
				background: bg,
				color,
				border: `1px solid ${borderColor}`,
				borderRadius: "3px",
				padding: "10px 0",
				fontSize: "clamp(12px, 3vw, 14px)",
				fontFamily: MONO,
				letterSpacing: "0.22em",
				cursor: disabled ? "default" : "pointer",
				width: "100%",
				transition: "all 0.15s ease",
				textShadow:
					!disabled && hovered && primary
						? `0 0 12px rgba(232,160,32,0.5)`
						: "none",
				boxShadow:
					primary && hovered && !disabled
						? `0 0 16px rgba(232,160,32,0.15), inset 0 0 16px rgba(232,160,32,0.04)`
						: "none",
				minHeight: "44px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Decorative corner bolt
// ---------------------------------------------------------------------------

function Bolt({
	top,
	bottom,
	left,
	right,
}: {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
}) {
	return (
		<div
			aria-hidden="true"
			style={{
				position: "absolute",
				top,
				bottom,
				left,
				right,
				width: "8px",
				height: "8px",
				borderRadius: "50%",
				background: "radial-gradient(circle at 35% 35%, #8a8e92, #3a3c40)",
				boxShadow: "0 0 3px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15)",
			}}
		/>
	);
}

// ---------------------------------------------------------------------------
// Decorative rivet-grid background
// ---------------------------------------------------------------------------

function RivetBackground() {
	return (
		<>
			{/* Dark panel gradient */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(14,18,24,0.8) 0%, rgba(5,7,10,1) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Fine dot grid — simulates panel rivets */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle, rgba(232,160,32,0.06) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					pointerEvents: "none",
				}}
			/>

			{/* Vignette overlay */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Subtle horizontal scan lines */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
					pointerEvents: "none",
				}}
			/>
		</>
	);
}
