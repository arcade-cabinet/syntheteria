import { GameEndOverlay } from "../components/game/GameEndOverlay";
import { UnitDeathToast } from "../components/game/UnitDeathToast";
import type { GameSnapshot } from "../ecs/gameState";

export function GameOverlays({ snap }: { snap: GameSnapshot }) {
	return (
		<div className="absolute inset-0 pointer-events-none font-mono z-10">
			{/* Combat events toast (damage + component destruction) */}
			{snap.combatEvents.length > 0 && (
				<div className="absolute top-20 right-20 bg-red-950/85 border border-red-500/40 rounded-lg px-3.5 py-2 text-[11px] text-red-400 max-w-[220px]">
					{snap.combatEvents.slice(0, 3).map((event) => (
						<div key={`${event.targetId}-${event.componentDamaged}`}>
							{event.targetDestroyed
								? `${event.targetId} DESTROYED`
								: `${event.targetId}: ${event.componentDamaged} damaged`}
						</div>
					))}
				</div>
			)}

			{/* Unit death toast notifications */}
			<UnitDeathToast combatEvents={snap.combatEvents} />

			{/* Fragment merge notification */}
			{snap.mergeEvents.length > 0 && (
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-cyan-400 rounded-xl px-8 py-5 text-lg text-cyan-400 text-center">
					MAP FRAGMENTS MERGED
				</div>
			)}

			{/* Victory/Defeat overlay */}
			{snap.gameOutcome !== "playing" && (
				<GameEndOverlay outcome={snap.gameOutcome} />
			)}
		</div>
	);
}
