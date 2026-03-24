/**
 * Full-screen narrative overlay with typewriter text effect.
 *
 * Displays dialogue frames one at a time. Text appears character by character.
 * Click/tap/Space advances to the next frame. Skip button bypasses the sequence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	DialogueFrame,
	DialogueSequence,
} from "../../config/narrativeDefs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliseconds between each character appearing. */
const CHAR_INTERVAL = 35;

/** Milliseconds to wait after typewriter finishes before showing "continue" hint. */
const CONTINUE_DELAY = 600;

// ---------------------------------------------------------------------------
// Mood → style mapping
// ---------------------------------------------------------------------------

function moodColor(mood: DialogueFrame["mood"]): string {
	switch (mood) {
		case "urgent":
			return "#ff6644";
		case "glitch":
			return "#00ccff";
		case "calm":
			return "#88ffcc";
		default:
			return "#00ffaa";
	}
}

function moodShadow(mood: DialogueFrame["mood"]): string {
	const color = moodColor(mood);
	return `0 0 30px ${color}66`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NarrativeOverlay({
	sequence,
	onComplete,
}: {
	sequence: DialogueSequence;
	onComplete: () => void;
}) {
	const { frames } = sequence;
	const [frameIndex, setFrameIndex] = useState(0);
	const [displayedChars, setDisplayedChars] = useState(0);
	const [showContinue, setShowContinue] = useState(false);
	const [fadeIn, setFadeIn] = useState(false);
	const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const frame = frames[frameIndex];
	const fullText = frame?.text ?? "";
	const isTyping = displayedChars < fullText.length;

	// Cleanup all timers on unmount
	useEffect(() => {
		return () => {
			if (typewriterRef.current) clearInterval(typewriterRef.current);
			if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
			if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
		};
	}, []);

	// Start typewriter for current frame
	useEffect(() => {
		setDisplayedChars(0);
		setShowContinue(false);
		setFadeIn(false);

		const startDelay = frame?.delay ?? 400;

		delayTimerRef.current = setTimeout(() => {
			setFadeIn(true);

			typewriterRef.current = setInterval(() => {
				setDisplayedChars((prev) => {
					const next = prev + 1;
					if (next >= fullText.length) {
						if (typewriterRef.current) clearInterval(typewriterRef.current);
						typewriterRef.current = null;
					}
					return next;
				});
			}, CHAR_INTERVAL);
		}, startDelay);

		return () => {
			if (typewriterRef.current) {
				clearInterval(typewriterRef.current);
				typewriterRef.current = null;
			}
			if (delayTimerRef.current) {
				clearTimeout(delayTimerRef.current);
				delayTimerRef.current = null;
			}
		};
	}, [fullText, frame?.delay]);

	// Show "continue" hint after typewriter finishes
	useEffect(() => {
		if (!isTyping && displayedChars > 0) {
			continueTimerRef.current = setTimeout(
				() => setShowContinue(true),
				CONTINUE_DELAY,
			);
			return () => {
				if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
			};
		}
	}, [isTyping, displayedChars]);

	const advance = useCallback(() => {
		// If still typing, complete the text instantly
		if (isTyping) {
			if (typewriterRef.current) {
				clearInterval(typewriterRef.current);
				typewriterRef.current = null;
			}
			if (delayTimerRef.current) {
				clearTimeout(delayTimerRef.current);
				delayTimerRef.current = null;
			}
			setFadeIn(true);
			setDisplayedChars(fullText.length);
			return;
		}

		// Advance to next frame or complete
		if (frameIndex < frames.length - 1) {
			setFrameIndex((i) => i + 1);
		} else {
			onComplete();
		}
	}, [isTyping, frameIndex, frames.length, fullText.length, onComplete]);

	// Keyboard handler (Space or Enter to advance)
	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				advance();
			}
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [advance]);

	const color = moodColor(frame?.mood);
	const shadow = moodShadow(frame?.mood);
	const visibleText = fullText.slice(0, displayedChars);

	return (
		<button
			type="button"
			style={{
				position: "absolute",
				inset: 0,
				background: "#000",
				border: "none",
				zIndex: 100,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				width: "100%",
				height: "100%",
			}}
			onClick={advance}
		>
			{/* Scanline overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.02) 2px, rgba(0,255,170,0.02) 4px)",
					pointerEvents: "none",
				}}
			/>

			{/* Speaker label */}
			{frame?.speaker && (
				<div
					style={{
						fontFamily: "'Courier New', monospace",
						fontSize: "12px",
						letterSpacing: "0.3em",
						color: `${color}88`,
						marginBottom: "12px",
						textTransform: "uppercase",
						opacity: fadeIn ? 1 : 0,
						transition: "opacity 0.3s ease-in",
					}}
				>
					{frame.speaker}
				</div>
			)}

			{/* Dialogue text with typewriter */}
			<div
				style={{
					fontFamily: "'Courier New', monospace",
					fontSize: "clamp(16px, 3vw, 22px)",
					lineHeight: "2",
					textAlign: "center",
					maxWidth: "600px",
					padding: "0 32px",
					color,
					textShadow: shadow,
					whiteSpace: "pre-line",
					minHeight: "6em",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					opacity: fadeIn ? 1 : 0,
					transition: "opacity 0.3s ease-in",
				}}
			>
				{visibleText}
				{isTyping && (
					<span
						style={{
							borderRight: `2px solid ${color}`,
							animation: "blink 0.7s step-end infinite",
							marginLeft: "2px",
						}}
					/>
				)}
			</div>

			{/* Continue hint */}
			{showContinue && (
				<div
					style={{
						position: "absolute",
						bottom: "60px",
						fontFamily: "'Courier New', monospace",
						fontSize: "12px",
						color: "#00ffaa44",
						letterSpacing: "0.2em",
						animation: "pulse 2s ease-in-out infinite",
					}}
				>
					{frameIndex < frames.length - 1
						? "[ tap to continue ]"
						: "[ tap to begin ]"}
				</div>
			)}

			{/* Skip button */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onComplete();
				}}
				style={{
					position: "absolute",
					top: "20px",
					right: "20px",
					background: "transparent",
					border: "1px solid #00ffaa33",
					borderRadius: "4px",
					color: "#00ffaa44",
					fontFamily: "'Courier New', monospace",
					fontSize: "12px",
					padding: "6px 16px",
					cursor: "pointer",
					letterSpacing: "0.15em",
					zIndex: 101,
				}}
			>
				SKIP
			</button>

			{/* Progress dots */}
			<div
				style={{
					position: "absolute",
					bottom: "30px",
					display: "flex",
					gap: "8px",
				}}
			>
				{frames.map((f, i) => (
					<div
						key={`dot-${f.text.slice(0, 20)}`}
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: i === frameIndex ? color : `${color}33`,
							transition: "background 0.3s",
						}}
					/>
				))}
			</div>

			{/* Inline keyframe animations */}
			<style>
				{`
					@keyframes blink {
						50% { opacity: 0; }
					}
					@keyframes pulse {
						0%, 100% { opacity: 0.4; }
						50% { opacity: 0.8; }
					}
				`}
			</style>
		</button>
	);
}
