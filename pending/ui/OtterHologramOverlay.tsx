/**
 * Otter Hologram Overlay — Patron AI holographic message display.
 *
 * Shows a holographic otter patron message with scanline effect,
 * blue tint, slight transparency, and speech bubble text.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
	dismissHologram,
	getActiveHologramMessage,
	getDisplayProgress,
	subscribeOtterHologram,
} from "../systems/otterHologram";

export function OtterHologramOverlay() {
	const message = useSyncExternalStore(
		subscribeOtterHologram,
		getActiveHologramMessage,
	);
	const progress = useSyncExternalStore(
		subscribeOtterHologram,
		getDisplayProgress,
	);

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		if (message) {
			el.style.transition = "opacity 300ms, transform 300ms";
			el.style.opacity = "1";
			el.style.transform = "translateY(0px)";
		} else {
			el.style.transition = "opacity 200ms, transform 200ms";
			el.style.opacity = "0";
			el.style.transform = "translateY(20px)";
		}
	}, [message]);

	if (!message) return null;

	return (
		<div
			ref={containerRef}
			className="fixed z-[55]"
			style={{
				bottom: 80,
				left: "50%",
				transform: "translateX(-50%) translateY(0px)",
				width: "min(420px, 88vw)",
				opacity: 0,
				pointerEvents: "none",
			}}
		>
			<button
				type="button"
				onClick={dismissHologram}
				aria-label="Dismiss hologram message"
				style={{
					display: "block",
					width: "100%",
					textAlign: "left",
					border: "1.5px solid rgba(102, 178, 255, 0.35)",
					borderRadius: 12,
					backgroundColor: "rgba(10, 25, 45, 0.92)",
					overflow: "hidden",
					backdropFilter: "blur(12px)",
					cursor: "pointer",
					padding: 0,
				}}
			>
				{/* Scanline overlay effect */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: 0.06,
						backgroundColor: "transparent",
						borderRadius: 12,
					}}
				/>

				{/* Header with otter icon placeholder */}
				<div
					style={{
						paddingLeft: 16,
						paddingRight: 16,
						paddingTop: 14,
						paddingBottom: 4,
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 10,
					}}
				>
					{/* Otter avatar circle */}
					<div
						style={{
							width: 32,
							height: 32,
							borderRadius: 16,
							border: "1.5px solid rgba(102, 178, 255, 0.4)",
							backgroundColor: "rgba(102, 178, 255, 0.1)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontSize: 16,
								color: "#66b2ff",
								fontFamily: "monospace",
							}}
						>
							P
						</span>
					</div>

					<div style={{ flex: 1 }}>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 8,
								letterSpacing: "2px",
								color: "rgba(102, 178, 255, 0.5)",
								textTransform: "uppercase",
								display: "block",
							}}
						>
							Patron Transmission
						</span>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 13,
								fontWeight: 700,
								color: "#a0cfff",
								letterSpacing: "0.5px",
								marginTop: 1,
								display: "block",
							}}
						>
							{message.title}
						</span>
					</div>

					{/* Dismiss hint */}
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(102, 178, 255, 0.3)",
							textTransform: "uppercase",
							letterSpacing: "1px",
						}}
					>
						tap
					</span>
				</div>

				{/* Message body */}
				<div
					style={{
						paddingLeft: 16,
						paddingRight: 16,
						paddingTop: 10,
						paddingBottom: 10,
					}}
				>
					<p
						style={{
							fontFamily: "monospace",
							fontSize: 12,
							color: "rgba(200, 220, 255, 0.8)",
							lineHeight: "18px",
							fontStyle: "italic",
							margin: 0,
						}}
					>
						{message.text}
					</p>
				</div>

				{/* Progress bar at bottom */}
				<div
					style={{
						height: 2,
						backgroundColor: "rgba(102, 178, 255, 0.1)",
					}}
				>
					<div
						style={{
							height: "100%",
							width: `${Math.round(progress * 100)}%`,
							backgroundColor: "rgba(102, 178, 255, 0.4)",
						}}
					/>
				</div>
			</button>
		</div>
	);
}
