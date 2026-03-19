/**
 * Keyboard shortcuts hook for the playing phase.
 *
 * Tab — cycle player units
 * Enter — advance turn
 * Z — toggle zoom level
 * Escape — toggle pause
 */

import { useEffect, useRef } from "react";
import { TILE_SIZE_M } from "../board";
import { getCameraControls } from "../camera";
import { UnitFaction, UnitPos } from "../traits";
import type { Phase, GameSession } from "./types";

interface KeyboardShortcutsConfig {
	phase: Phase;
	sceneReady: boolean;
	paused: boolean;
	selectedUnitId: number | null;
	session: GameSession | null;
	sessionRef: React.RefObject<GameSession | null>;
	setPaused: (fn: (prev: boolean) => boolean) => void;
	setSelectedUnitId: (id: number | null) => void;
	handleEndTurn: () => void;
}

export function useKeyboardShortcuts({
	phase,
	sceneReady,
	paused,
	selectedUnitId,
	session,
	sessionRef,
	setPaused,
	setSelectedUnitId,
	handleEndTurn,
}: KeyboardShortcutsConfig): void {
	const zoomToggledRef = useRef(false);

	useEffect(() => {
		if (phase !== "playing" || !sceneReady) return;

		const isTyping = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
		};

		const handler = (e: KeyboardEvent) => {
			if (isTyping(e)) return;

			if (e.key === "Escape") {
				setPaused((prev) => !prev);
				return;
			}
			if (paused) return;

			// Tab — cycle through player units
			if (e.key === "Tab") {
				e.preventDefault();
				const s = sessionRef.current;
				if (!s) return;
				const playerUnits: number[] = [];
				for (const ent of s.world.query(UnitPos, UnitFaction)) {
					const f = ent.get(UnitFaction);
					if (f?.factionId === "player") playerUnits.push(ent.id());
				}
				if (playerUnits.length === 0) return;
				playerUnits.sort((a, b) => a - b);
				const currentIdx = selectedUnitId != null ? playerUnits.indexOf(selectedUnitId) : -1;
				const nextIdx = (currentIdx + 1) % playerUnits.length;
				const nextId = playerUnits[nextIdx]!;
				setSelectedUnitId(nextId);
				for (const ent of s.world.query(UnitPos, UnitFaction)) {
					if (ent.id() === nextId) {
						const p = ent.get(UnitPos);
						if (p) getCameraControls()?.panTo(p.tileX * TILE_SIZE_M, p.tileZ * TILE_SIZE_M);
						break;
					}
				}
				return;
			}

			// Enter — advance turn
			if (e.key === "Enter") {
				e.preventDefault();
				handleEndTurn();
				return;
			}

			// Z — toggle zoom
			if (e.key === "z" || e.key === "Z") {
				const cam = getCameraControls();
				const s = sessionRef.current;
				if (!cam || !s) return;
				const R = Math.max(s.config.width, s.config.height) / (2 * Math.PI);
				if (zoomToggledRef.current) {
					cam.setZoom(R * 1.8);
					zoomToggledRef.current = false;
				} else {
					cam.setZoom(R * 5.5);
					zoomToggledRef.current = true;
				}
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [phase, sceneReady, paused, selectedUnitId, handleEndTurn, setSelectedUnitId, sessionRef, setPaused]);
}
