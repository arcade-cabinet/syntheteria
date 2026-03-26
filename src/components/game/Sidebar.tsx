/**
 * Sidebar — three sections: minimap (top), selection info (middle),
 * action panel (bottom).
 *
 * On desktop: left sidebar (w-64, full height).
 * On mobile: bottom panel (h-48, sections side-by-side).
 */

import { ActionPanel } from "./ActionPanel";
import { Minimap } from "./Minimap";
import { SelectionInfo } from "./SelectionInfo";

export function Sidebar() {
	return (
		<div
			className={
				// Desktop: vertical column. Mobile: horizontal row in bottom panel.
				"flex md:flex-col gap-1.5 p-1.5 h-full overflow-y-auto overflow-x-hidden"
			}
		>
			{/* Minimap */}
			<div className="flex-shrink-0 w-1/3 md:w-full">
				<Minimap />
			</div>

			{/* Selection info */}
			<div className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
				<SelectionInfo />
			</div>

			{/* Action panel */}
			<div className="flex-shrink-0 w-1/3 md:w-full bg-slate-900 border border-slate-800 rounded-lg p-2">
				<ActionPanel />
			</div>
		</div>
	);
}
