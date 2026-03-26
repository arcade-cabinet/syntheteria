/**
 * NewGameModal — simplified for RTS single-player.
 *
 * Collects:
 *   - World seed (text, auto-generates if empty)
 *   - Difficulty (Easy / Normal / Hard — affects cult escalation speed)
 */

import { useCallback, useMemo, useState } from "react";
import { fnv1a, seededRng } from "../../board/noise";
import { generateWorldName } from "../../config/seedPools";

export type Difficulty = "easy" | "normal" | "hard";

export interface NewGameConfig {
	seed: string;
	gameplaySeed: string;
	difficulty: Difficulty;
	worldName: string;
}

const DIFFICULTY_INFO: Record<Difficulty, { label: string; desc: string }> = {
	easy: { label: "EASY", desc: "Slower cult escalation. More resources." },
	normal: { label: "NORMAL", desc: "Balanced challenge." },
	hard: { label: "HARD", desc: "Aggressive cults. Scarce resources." },
};

function generateSeed(): string {
	return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function worldNameFromSeed(seed: string): string {
	const rng = seededRng(`worldname:${seed}`);
	return generateWorldName(rng);
}

export function NewGameModal({
	onStart,
	onCancel,
}: {
	onStart: (config: NewGameConfig) => void;
	onCancel: () => void;
}) {
	const [seed, setSeed] = useState(generateSeed);
	const [difficulty, setDifficulty] = useState<Difficulty>("normal");

	const worldName = useMemo(() => worldNameFromSeed(seed), [seed]);

	const handleReroll = useCallback(() => {
		setSeed(generateSeed());
	}, []);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const finalSeed = seed.trim() || generateSeed();
		onStart({
			seed: finalSeed,
			gameplaySeed: fnv1a(`gameplay:${finalSeed}`).toString(36),
			difficulty,
			worldName: worldNameFromSeed(finalSeed),
		});
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.85)",
				zIndex: 210,
			}}
		>
			<form
				onSubmit={handleSubmit}
				style={{
					background: "#0a0a0a",
					border: "1px solid #8be6ff44",
					borderRadius: "12px",
					padding: "32px 40px",
					fontFamily: "'Courier New', monospace",
					color: "#8be6ff",
					minWidth: "320px",
					maxWidth: "420px",
					display: "flex",
					flexDirection: "column",
					gap: "24px",
				}}
			>
				{/* Header */}
				<div
					style={{
						fontSize: "14px",
						letterSpacing: "0.25em",
						textTransform: "uppercase",
						textAlign: "center",
						textShadow: "0 0 20px rgba(139,230,255,0.3)",
					}}
				>
					INITIALIZE
				</div>

				{/* World Name */}
				<div style={{ textAlign: "center" }}>
					<span
						style={{
							fontSize: "11px",
							letterSpacing: "0.2em",
							color: "#8be6ff88",
							display: "block",
							marginBottom: "8px",
						}}
					>
						WORLD DESIGNATION
					</span>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
						}}
					>
						<span
							style={{
								fontSize: "16px",
								letterSpacing: "0.1em",
								color: "#8be6ff",
								textShadow: "0 0 12px rgba(139,230,255,0.4)",
							}}
						>
							{worldName}
						</span>
						<button
							type="button"
							onClick={handleReroll}
							title="Re-roll world"
							style={{
								background: "rgba(139,230,255,0.08)",
								border: "1px solid #8be6ff33",
								borderRadius: "6px",
								padding: "4px 8px",
								fontSize: "14px",
								color: "#8be6ff",
								cursor: "pointer",
								fontFamily: "'Courier New', monospace",
							}}
						>
							{"\u21BB"}
						</button>
					</div>
				</div>

				{/* Seed */}
				<div>
					<label
						htmlFor="seed-input"
						style={{
							fontSize: "11px",
							letterSpacing: "0.2em",
							color: "#8be6ff88",
							display: "block",
							marginBottom: "6px",
						}}
					>
						WORLD SEED
					</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<input
							id="seed-input"
							type="text"
							value={seed}
							onChange={(e) => setSeed(e.target.value)}
							spellCheck={false}
							autoComplete="off"
							style={{
								flex: 1,
								background: "rgba(139,230,255,0.05)",
								border: "1px solid #8be6ff33",
								borderRadius: "6px",
								padding: "8px 12px",
								fontSize: "13px",
								fontFamily: "'Courier New', monospace",
								color: "#8be6ff",
								outline: "none",
							}}
						/>
						<button
							type="button"
							onClick={handleReroll}
							title="Random seed"
							style={{
								background: "rgba(139,230,255,0.08)",
								border: "1px solid #8be6ff33",
								borderRadius: "6px",
								padding: "8px 10px",
								fontSize: "14px",
								color: "#8be6ff",
								cursor: "pointer",
								fontFamily: "'Courier New', monospace",
							}}
						>
							{"\u21BB"}
						</button>
					</div>
				</div>

				{/* Difficulty */}
				<div>
					<span
						style={{
							fontSize: "11px",
							letterSpacing: "0.2em",
							color: "#8be6ff88",
							display: "block",
							marginBottom: "8px",
						}}
					>
						DIFFICULTY
					</span>
					<div style={{ display: "flex", gap: "8px" }}>
						{(["easy", "normal", "hard"] as Difficulty[]).map((d) => {
							const info = DIFFICULTY_INFO[d];
							const selected = difficulty === d;
							return (
								<button
									type="button"
									key={d}
									onClick={() => setDifficulty(d)}
									title={info.desc}
									style={{
										flex: 1,
										background: selected
											? "rgba(139,230,255,0.15)"
											: "transparent",
										color: selected ? "#8be6ff" : "#8be6ff66",
										border: selected
											? "1px solid #8be6ff88"
											: "1px solid #8be6ff22",
										borderRadius: "6px",
										padding: "10px 6px",
										fontSize: "12px",
										fontFamily: "'Courier New', monospace",
										letterSpacing: "0.15em",
										cursor: "pointer",
										transition: "all 0.15s ease",
									}}
								>
									{info.label}
								</button>
							);
						})}
					</div>
					<div
						style={{
							fontSize: "10px",
							color: "#8be6ff55",
							marginTop: "6px",
							textAlign: "center",
						}}
					>
						{DIFFICULTY_INFO[difficulty].desc}
					</div>
				</div>

				{/* Actions */}
				<div
					style={{
						display: "flex",
						gap: "12px",
						justifyContent: "space-between",
					}}
				>
					<button
						type="button"
						onClick={onCancel}
						style={{
							background: "transparent",
							border: "none",
							color: "#8be6ff44",
							fontFamily: "'Courier New', monospace",
							fontSize: "12px",
							letterSpacing: "0.15em",
							cursor: "pointer",
							padding: "8px 0",
						}}
					>
						BACK
					</button>
					<button
						type="submit"
						style={{
							flex: 1,
							background: "rgba(139,230,255,0.1)",
							border: "1px solid #8be6ff55",
							borderRadius: "6px",
							padding: "12px 24px",
							fontSize: "13px",
							fontFamily: "'Courier New', monospace",
							letterSpacing: "0.2em",
							color: "#8be6ff",
							cursor: "pointer",
							textShadow: "0 0 10px rgba(139,230,255,0.3)",
						}}
					>
						[ START ]
					</button>
				</div>
			</form>
		</div>
	);
}
