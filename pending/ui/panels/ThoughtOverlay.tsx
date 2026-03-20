/**
 * ThoughtOverlay — AI narration that is dismissible and non-blocking.
 *
 * Positions at bottom-center so it doesn't cover gameplay.
 * Auto-dismisses after 6 seconds.
 * Tap/click to dismiss immediately.
 * Pointer events pass through to the game scene when no thought is shown.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { dismissThought } from "../../systems/narrative";

const AUTO_DISMISS_MS = 6000;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 300;

export function ThoughtOverlay() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const thought = snap.activeThought;
	const [opacity, setOpacity] = useState(0);
	const [translateY, setTranslateY] = useState(20);
	const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (thought) {
			// Animate in
			setOpacity(1);
			setTranslateY(0);

			// Set auto-dismiss
			autoDismissTimer.current = setTimeout(() => {
				setOpacity(0);
				setTranslateY(20);
				setTimeout(() => {
					dismissThought();
				}, FADE_OUT_MS);
			}, AUTO_DISMISS_MS);

			return () => {
				if (autoDismissTimer.current) {
					clearTimeout(autoDismissTimer.current);
				}
			};
		}

		// Reset when thought clears
		setOpacity(0);
		setTranslateY(20);
		return undefined;
	}, [thought]);

	if (!thought) return null;

	const handleDismiss = () => {
		if (autoDismissTimer.current) {
			clearTimeout(autoDismissTimer.current);
		}
		setOpacity(0);
		setTranslateY(20);
		setTimeout(() => {
			dismissThought();
		}, FADE_OUT_MS);
	};

	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 24,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					opacity,
					transform: `translateY(${translateY}px)`,
					transition: `opacity ${opacity === 1 ? FADE_IN_MS : FADE_OUT_MS}ms ease, transform ${opacity === 1 ? FADE_IN_MS : FADE_OUT_MS}ms ease`,
				}}
			>
				<button
					onClick={handleDismiss}
					aria-label="Dismiss thought"
					style={{
						maxWidth: 480,
						minWidth: 240,
						borderRadius: 14,
						border: "1px solid rgba(111, 243, 200, 0.18)",
						backgroundColor: "rgba(7, 17, 23, 0.88)",
						paddingLeft: 20,
						paddingRight: 20,
						paddingTop: 12,
						paddingBottom: 12,
						pointerEvents: "auto",
						cursor: "pointer",
						textAlign: "left",
					}}
				>
					<p
						style={{
							margin: 0,
							fontFamily: "monospace",
							fontSize: 13,
							lineHeight: "20px",
							letterSpacing: 0.3,
							color: "#e3fff5",
						}}
					>
						{thought.text}
					</p>
					<span
						style={{
							display: "block",
							marginTop: 6,
							fontFamily: "monospace",
							fontSize: 8,
							textTransform: "uppercase",
							letterSpacing: 1.5,
							color: "rgba(255, 255, 255, 0.25)",
						}}
					>
						Tap to dismiss
					</span>
				</button>
			</div>
		</div>
	);
}
