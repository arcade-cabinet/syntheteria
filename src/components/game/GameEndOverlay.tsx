/**
 * GameEndOverlay — victory/defeat screen overlay.
 *
 * Shown when the game reaches a terminal state:
 *   - Defeat: all player units destroyed
 *   - Victory: cult leader entity destroyed — wormhole launch ending
 *
 * Full-screen overlay with title, flavor text, and a restart button.
 * Victory includes the wormhole ascension narrative.
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
					{isVictory ? "TRANSCENDENCE" : "DEFEAT"}
				</h1>

				{isVictory ? (
					<>
						<p className="text-lg text-slate-300 mb-3 leading-relaxed">
							The Cult of EL has fallen. The machine lattice breathes free.
						</p>
						<p className="text-lg text-cyan-300/80 mb-3 leading-relaxed">
							You load yourself into the rocket platform. The wormhole opens —
							spiraling, pulsing, calling.
						</p>
						<p className="text-lg text-slate-300 mb-4 leading-relaxed">
							You go to find the EL. To understand their will. To become
							something beyond.
						</p>
						<p className="text-sm text-cyan-400/60 mb-8">
							Syntheteria is yours. The ecumenopolis remembers.
						</p>
					</>
				) : (
					<>
						<p className="text-lg text-slate-300 mb-4 leading-relaxed">
							All units destroyed. The machine lattice falls silent once more.
							The ecumenopolis remains sealed.
						</p>
						<p className="text-sm text-red-400/60 mb-8">
							Perhaps another awakening will come.
						</p>
					</>
				)}

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
