/**
 * GameEndOverlay — victory/defeat screen overlay.
 *
 * Shown when the game reaches a terminal state:
 *   - Defeat: all player units destroyed
 *   - Victory: cult leader entity destroyed
 *
 * Full-screen overlay with title, flavor text, and a restart button.
 */

import type { GameOutcome } from "../../systems/victoryDefeat";

interface GameEndOverlayProps {
	outcome: GameOutcome;
}

export function GameEndOverlay({ outcome }: GameEndOverlayProps) {
	if (outcome === "playing") return null;

	const isVictory = outcome === "victory";

	return (
		<div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
			{/* Backdrop */}
			<div
				className={`absolute inset-0 ${
					isVictory ? "bg-cyan-950/90" : "bg-red-950/90"
				}`}
			/>

			{/* Content */}
			<div className="relative text-center max-w-lg px-8">
				<h1
					className={`text-5xl font-bold tracking-widest mb-6 ${
						isVictory ? "text-cyan-400" : "text-red-400"
					}`}
				>
					{isVictory ? "VICTORY" : "DEFEAT"}
				</h1>

				<p className="text-lg text-slate-300 mb-4 leading-relaxed">
					{isVictory
						? "The Cult of EL has fallen. The machine lattice breathes free. The wormhole awaits."
						: "All units destroyed. The machine lattice falls silent once more. The ecumenopolis remains sealed."}
				</p>

				<p
					className={`text-sm mb-8 ${
						isVictory ? "text-cyan-400/60" : "text-red-400/60"
					}`}
				>
					{isVictory
						? "Syntheteria is yours."
						: "Perhaps another awakening will come."}
				</p>

				<button
					type="button"
					onClick={() => window.location.reload()}
					className={`px-8 py-3 rounded-lg font-mono text-lg tracking-wide cursor-pointer transition-colors ${
						isVictory
							? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
							: "bg-red-500 text-slate-950 hover:bg-red-400"
					}`}
				>
					NEW GAME
				</button>
			</div>
		</div>
	);
}
