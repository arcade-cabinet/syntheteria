/**
 * GameLayout — responsive RTS HUD container.
 *
 * Desktop (>=768px): Left sidebar (w-64) with minimap/selection/actions.
 *                    TopBar across the top of the game area.
 *                    GameCanvas fills remaining space.
 *
 * Mobile (<768px):   Bottom panel (h-48) with minimap, selection, actions
 *                    side-by-side. TopBar across top.
 *                    All buttons accessible without keyboard (US-6.5).
 *
 * Children are rendered into the game area (GameCanvas, overlays, etc).
 */

import type { ReactNode } from "react";
import { BasePanel } from "../../components/base/BasePanel";
import { Sidebar } from "../../components/game/Sidebar";
import { TopBar } from "../../components/game/TopBar";

export interface GameLayoutProps {
	children: ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
	return (
		<div className="flex flex-col-reverse md:flex-row h-screen w-screen bg-black font-mono">
			{/* Sidebar (desktop) / Bottom panel (mobile) — US-6.5 */}
			<div className="w-full md:w-64 h-48 md:h-full flex-shrink-0 bg-slate-950 border-t md:border-t-0 md:border-r border-slate-800 z-30 overflow-y-auto">
				<Sidebar />
			</div>

			{/* Game area */}
			<div className="flex-1 relative overflow-hidden bg-[#03070b]">
				{/* TopBar overlay */}
				<div className="absolute top-0 w-full z-20 pointer-events-none">
					<TopBar />
				</div>

				{/* Game canvas + overlays */}
				{children}

				{/* Base management side panel (slides from right) */}
				<BasePanel />
			</div>
		</div>
	);
}
