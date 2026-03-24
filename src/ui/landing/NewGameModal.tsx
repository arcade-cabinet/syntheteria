/**
 * NewGameModal — simplified for RTS single-player.
 *
 * Collects:
 *   - World seed (text, auto-generates if empty)
 *   - Difficulty (Easy / Normal / Hard — affects cult escalation speed)
 */

import { useState } from "react";

export type Difficulty = "easy" | "normal" | "hard";

export interface NewGameConfig {
	seed: string;
	difficulty: Difficulty;
}

const DIFFICULTY_INFO: Record<Difficulty, { label: string; desc: string }> = {
	easy: { label: "EASY", desc: "Slower cult escalation. More resources." },
	normal: { label: "NORMAL", desc: "Balanced challenge." },
	hard: { label: "HARD", desc: "Aggressive cults. Scarce resources." },
};

function generateSeed(): string {
	return Math.random().toString(36).slice(2, 10).toUpperCase();
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

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onStart({ seed: seed.trim() || generateSeed(), difficulty });
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
					border: "1px solid #00ffaa44",
					borderRadius: "12px",
					padding: "32px 40px",
					fontFamily: "'Courier New', monospace",
					color: "#00ffaa",
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
						textShadow: "0 0 20px rgba(0,255,170,0.3)",
					}}
				>
					INITIALIZE
				</div>

				{/* Seed */}
				<div>
					<label
						style={{
							fontSize: "11px",
							letterSpacing: "0.2em",
							color: "#00ffaa88",
							display: "block",
							marginBottom: "6px",
						}}
					>
						WORLD SEED
					</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<input
							type="text"
							value={seed}
							onChange={(e) => setSeed(e.target.value)}
							spellCheck={false}
							autoComplete="off"
							style={{
								flex: 1,
								background: "rgba(0,255,170,0.05)",
								border: "1px solid #00ffaa33",
								borderRadius: "6px",
								padding: "8px 12px",
								fontSize: "13px",
								fontFamily: "'Courier New', monospace",
								color: "#00ffaa",
								outline: "none",
							}}
						/>
						<button
							type="button"
							onClick={() => setSeed(generateSeed())}
							title="Random seed"
							style={{
								background: "rgba(0,255,170,0.08)",
								border: "1px solid #00ffaa33",
								borderRadius: "6px",
								padding: "8px 10px",
								fontSize: "14px",
								color: "#00ffaa",
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
					<label
						style={{
							fontSize: "11px",
							letterSpacing: "0.2em",
							color: "#00ffaa88",
							display: "block",
							marginBottom: "8px",
						}}
					>
						DIFFICULTY
					</label>
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
											? "rgba(0,255,170,0.15)"
											: "transparent",
										color: selected ? "#00ffaa" : "#00ffaa66",
										border: selected
											? "1px solid #00ffaa88"
											: "1px solid #00ffaa22",
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
							color: "#00ffaa55",
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
							color: "#00ffaa44",
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
							background: "rgba(0,255,170,0.1)",
							border: "1px solid #00ffaa55",
							borderRadius: "6px",
							padding: "12px 24px",
							fontSize: "13px",
							fontFamily: "'Courier New', monospace",
							letterSpacing: "0.2em",
							color: "#00ffaa",
							cursor: "pointer",
							textShadow: "0 0 10px rgba(0,255,170,0.3)",
						}}
					>
						[ START ]
					</button>
				</div>
			</form>
		</div>
	);
}
