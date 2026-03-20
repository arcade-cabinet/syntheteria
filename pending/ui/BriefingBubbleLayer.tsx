import { useSyncExternalStore } from "react";
import { getActiveBriefingBubbles } from "../world/briefingBubbles";
import {
	getRuntimeState,
	setCitySiteModalOpen,
	subscribeRuntimeState,
} from "../world/runtimeState";
import { getActiveWorldSession } from "../world/session";

function positionClass(screenHint: "top-left" | "top-center" | "top-right") {
	switch (screenHint) {
		case "top-left":
			return "self-start";
		case "top-right":
			return "self-end";
		case "top-center":
		default:
			return "self-center";
	}
}

function toneStyle(tone: "signal" | "mint" | "amber" | "crimson") {
	switch (tone) {
		case "mint":
			return {
				borderColor: "rgba(111, 243, 200, 0.28)",
				eyebrowColor: "#6ff3c8",
			};
		case "amber":
			return {
				borderColor: "rgba(246, 197, 106, 0.28)",
				eyebrowColor: "#f6c56a",
			};
		case "crimson":
			return {
				borderColor: "rgba(255, 143, 143, 0.28)",
				eyebrowColor: "#ff8f8f",
			};
		case "signal":
		default:
			return {
				borderColor: "rgba(139, 230, 255, 0.28)",
				eyebrowColor: "#8be6ff",
			};
	}
}

export function BriefingBubbleLayer() {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const bubbles = getActiveBriefingBubbles({
		runtime,
		session: getActiveWorldSession(),
	});

	if (bubbles.length === 0) {
		return null;
	}

	return (
		<div
			className="absolute left-0 right-0 flex flex-col gap-2 px-4"
			style={{ bottom: 80, pointerEvents: "none" }}
		>
			{bubbles.map((bubble) => {
				const tone = toneStyle(bubble.tone);
				const canOpenSiteBrief =
					bubble.anchor === "nearby-site" || bubble.anchor === "active-site";
				const posClass = positionClass(bubble.screenHint);

				const bubbleContent = (
					<>
						<span
							className="block font-mono text-[10px] uppercase tracking-[0.22em]"
							style={{ color: tone.eyebrowColor }}
						>
							{bubble.title}
						</span>
						<p
							className="mt-2 font-mono text-[11px] leading-[18px]"
							style={{ color: "rgba(255, 255, 255, 0.76)" }}
						>
							{bubble.body}
						</p>
					</>
				);

				if (!canOpenSiteBrief) {
					return (
						<div
							key={bubble.id}
							data-testid={`briefing-bubble-${bubble.anchor}`}
							className={`max-w-[300px] rounded-xl px-3 py-2 z-20 ${posClass}`}
							style={{
								backgroundColor: "rgba(7, 17, 27, 0.85)",
								border: `1px solid ${tone.borderColor}`,
								boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.3)",
								pointerEvents: "none",
							}}
						>
							{bubbleContent}
						</div>
					);
				}

				return (
					<button
						key={bubble.id}
						type="button"
						data-testid={`briefing-bubble-${bubble.anchor}`}
						onClick={() => setCitySiteModalOpen(true, runtime.nearbyPoi)}
						className={`max-w-[300px] rounded-xl px-3 py-2 z-20 text-left ${posClass}`}
						style={{
							backgroundColor: "rgba(7, 17, 27, 0.85)",
							border: `1px solid ${tone.borderColor}`,
							boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.3)",
							pointerEvents: "auto",
						}}
					>
						{bubbleContent}
					</button>
				);
			})}
		</div>
	);
}
