/**
 * EventBus — bidirectional React ↔ Phaser communication.
 *
 * Official Phaser + React pattern. Phaser scenes emit events
 * (scene-ready, tile-clicked, unit-selected). React listens
 * and updates DOM. React emits events (end-turn, select-unit).
 * Phaser scenes listen and update the board.
 *
 * No React dependency — this is a pure Phaser EventEmitter.
 */

import { Events } from "phaser";

export const EventBus = new Events.EventEmitter();
