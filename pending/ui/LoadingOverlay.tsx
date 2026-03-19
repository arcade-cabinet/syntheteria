import { useEffect, useRef, useState } from "react";

const LOADING_STAGES = [
	"Encoding sector lattice",
	"Anchoring relay spines",
	"Seeding structural districts",
	"Mapping storm pressure corridors",
	"Committing to distributed archive",
] as const;

/**
 * Full-screen diegetic loading overlay.
 *
 * Centered spinner ring, bold stage text, gradient progress bar,
 * and staged sub-messages. Composites over the live storm scene with
 * reduced backdrop opacity so lightning and cloud churn remain visible
 * underneath.
 */
export function LoadingOverlay({ label }: { label: string }) {
	const [stageIndex, setStageIndex] = useState(0);
	const [progressPercent, setProgressPercent] = useState(20);
	const [glowVisible, setGlowVisible] = useState(true);

	// Progress bar: advances as stages progress
	useEffect(() => {
		const interval = setInterval(() => {
			setStageIndex((prev) => {
				const next = Math.min(prev + 1, LOADING_STAGES.length - 1);
				setProgressPercent(((next + 1) / LOADING_STAGES.length) * 100);
				return next;
			});
		}, 2200);

		return () => clearInterval(interval);
	}, []);

	// Glow pulse for stage sub-text
	useEffect(() => {
		const interval = setInterval(() => {
			setGlowVisible((v) => !v);
		}, 1600);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="absolute inset-0 flex items-center justify-center bg-[#020307]/55">
			<div
				className="flex flex-col items-center"
				style={{ maxWidth: 480, width: "100%" }}
			>
				{/* Spinner ring — CSS animation */}
				<div
					className="animate-spin"
					style={{
						width: 80,
						height: 80,
						borderRadius: "50%",
						borderWidth: 3,
						borderStyle: "solid",
						borderColor: "rgba(139, 230, 255, 0.2)",
						borderTopColor: "#8be6ff",
					}}
				/>

				{/* Main label */}
				<span
					className="mt-8 font-mono text-center uppercase"
					style={{
						fontSize: 28,
						letterSpacing: 4,
						color: "#8be6ff",
						textTransform: "uppercase",
						textShadow: "0 0 16px rgba(139, 230, 255, 0.5)",
					}}
				>
					{label}
				</span>

				{/* Stage sub-text with CSS opacity transition */}
				<span
					className="mt-3 font-mono text-center uppercase transition-opacity duration-700"
					style={{
						fontSize: 11,
						letterSpacing: 3,
						color: "rgba(139, 230, 255, 0.55)",
						opacity: glowVisible ? 0.8 : 0.4,
					}}
				>
					{LOADING_STAGES[stageIndex]}
				</span>

				{/* Progress bar */}
				<div
					className="mt-6 overflow-hidden rounded-full"
					style={{
						width: "80%",
						height: 6,
						backgroundColor: "rgba(139, 230, 255, 0.08)",
						border: "1px solid rgba(139, 230, 255, 0.12)",
					}}
				>
					<div
						className="h-full rounded-full transition-all duration-500 bg-[#8be6ff]/70"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>

				{/* Stage dots */}
				<div className="mt-4 flex flex-row items-center justify-center gap-2">
					{LOADING_STAGES.map((stage, i) => (
						<div
							key={stage}
							style={{
								width: 5,
								height: 5,
								borderRadius: "50%",
								backgroundColor:
									i <= stageIndex ? "#8be6ff" : "rgba(255, 255, 255, 0.1)",
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
