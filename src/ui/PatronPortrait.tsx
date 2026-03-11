/**
 * PatronPortrait — holographic AI patron portrait for faction selection.
 *
 * Renders the patron AI's ASCII art avatar inside a hologram-style
 * frame with animated scan lines, color bleed, and glitch effects.
 *
 * Visual language:
 * - Semi-transparent with faction-colored glow
 * - Animated vertical scan line sweeping downward
 * - Horizontal CRT scan lines (CSS gradient)
 * - Glitch shift on hover / select (color channel separation)
 * - "HOLOGRAM" badge in top-left corner
 *
 * Pure animation — no game state subscriptions.
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FONT_MONO } from "./designTokens";
import type { PatronPersona } from "./patronData";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAN_LINE_PERIOD = 2400; // ms per scan cycle

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatronPortraitProps {
	persona: PatronPersona;
	isSelected: boolean;
	isHovered: boolean;
	/** Portrait width in px (default 120) */
	size?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PatronPortrait = memo(function PatronPortrait({
	persona,
	isSelected,
	isHovered,
	size = 120,
}: PatronPortraitProps) {
	const [scanOffset, setScanOffset] = useState(0);
	const [glitch, setGlitch] = useState(false);
	const rafRef = useRef<number>(0);
	const glitchSeedRef = useRef(0.5);

	// Animate scan line
	useEffect(() => {
		let running = true;
		const animate = (t: number) => {
			if (!running) return;
			setScanOffset(((t % SCAN_LINE_PERIOD) / SCAN_LINE_PERIOD) * 100);
			rafRef.current = requestAnimationFrame(animate);
		};
		rafRef.current = requestAnimationFrame(animate);
		return () => {
			running = false;
			cancelAnimationFrame(rafRef.current);
		};
	}, []);

	// Glitch on hover transitions and selection
	useEffect(() => {
		if (isHovered || isSelected) {
			glitchSeedRef.current = Math.random();
			setGlitch(true);
			const t = setTimeout(() => setGlitch(false), 80 + Math.random() * 100);
			return () => clearTimeout(t);
		}
	}, [isHovered, isSelected]);

	const active = isSelected || isHovered;
	const holoColor = persona.holoColor;
	const glowColor = persona.glowColor;

	// Glitch translation
	const glitchX = glitch ? (glitchSeedRef.current - 0.5) * 6 : 0;
	const glitchY = glitch ? (glitchSeedRef.current * 0.7 - 0.35) * 4 : 0;

	// Intensity scale with selection/hover
	const intensity = isSelected ? 1.0 : isHovered ? 0.75 : 0.45;

	const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

	return (
		<div
			aria-hidden="true"
			onClick={stopPropagation}
			style={{
				position: "relative",
				width: `${size}px`,
				height: `${size}px`,
				flexShrink: 0,
				overflow: "hidden",
				borderRadius: "4px",
				border: `1px solid ${holoColor}${Math.round(intensity * 60).toString(16).padStart(2, "0")}`,
				background: `rgba(0, 8, 4, ${0.6 + intensity * 0.3})`,
				boxShadow: active
					? `0 0 16px ${glowColor}40, inset 0 0 12px ${holoColor}18`
					: `inset 0 0 8px ${holoColor}08`,
				transition: "border-color 0.2s, box-shadow 0.2s",
				cursor: "default",
			}}
		>
			{/* ASCII art portrait */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: FONT_MONO,
					fontSize: `${Math.round(size * 0.095)}px`,
					lineHeight: 1.4,
					color: holoColor,
					opacity: intensity,
					transform: `translate(${glitchX}px, ${glitchY}px)`,
					transition: glitch ? "none" : "transform 0.1s ease-out",
					userSelect: "none",
					whiteSpace: "pre",
					textShadow: active
						? `0 0 6px ${holoColor}88, 0 0 12px ${holoColor}44`
						: `0 0 4px ${holoColor}44`,
					// Color channel split on glitch
					filter: glitch ? `drop-shadow(2px 0 0 #ff2200aa) drop-shadow(-2px 0 0 #0033ffaa)` : "none",
				}}
			>
				{persona.asciiArt.map((row, i) => (
					<div key={i}>{row}</div>
				))}
			</div>

			{/* Animated scan line */}
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: `${scanOffset}%`,
					height: "3px",
					background: `linear-gradient(180deg, transparent 0%, ${holoColor}66 50%, transparent 100%)`,
					opacity: intensity,
					pointerEvents: "none",
					mixBlendMode: "screen",
				}}
			/>

			{/* CRT scan lines overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `repeating-linear-gradient(
						0deg,
						transparent,
						transparent 2px,
						rgba(0, 0, 0, 0.08) 2px,
						rgba(0, 0, 0, 0.08) 4px
					)`,
					pointerEvents: "none",
					zIndex: 2,
				}}
			/>

			{/* HOLOGRAM badge */}
			<div
				style={{
					position: "absolute",
					top: "4px",
					left: "4px",
					fontFamily: FONT_MONO,
					fontSize: "7px",
					color: `${holoColor}88`,
					letterSpacing: "0.15em",
					pointerEvents: "none",
					zIndex: 3,
				}}
			>
				HOLO
			</div>

			{/* Corner bracket — bottom-right */}
			<div
				style={{
					position: "absolute",
					bottom: "4px",
					right: "4px",
					width: "10px",
					height: "10px",
					borderBottom: `1px solid ${holoColor}${Math.round(intensity * 180).toString(16).padStart(2, "0")}`,
					borderRight: `1px solid ${holoColor}${Math.round(intensity * 180).toString(16).padStart(2, "0")}`,
					pointerEvents: "none",
					zIndex: 3,
				}}
			/>
			{/* Corner bracket — top-left */}
			<div
				style={{
					position: "absolute",
					top: "4px",
					left: "4px",
					width: "10px",
					height: "10px",
					borderTop: `1px solid ${holoColor}${Math.round(intensity * 180).toString(16).padStart(2, "0")}`,
					borderLeft: `1px solid ${holoColor}${Math.round(intensity * 180).toString(16).padStart(2, "0")}`,
					pointerEvents: "none",
					zIndex: 3,
				}}
			/>

			{/* Flicker vignette on active */}
			{active && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${glowColor}30 100%)`,
						pointerEvents: "none",
						zIndex: 1,
					}}
				/>
			)}
		</div>
	);
});
