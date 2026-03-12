import { worldToHex, getFragment, getAllFragments, Tile } from "../ecs/terrain";
import { Direction } from "honeycomb-grid";

function heuristic(aq: number, ar: number, bq: number, br: number): number {
    return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
}

const DIRECTIONS = [
    Direction.NE, Direction.E, Direction.SE,
    Direction.SW, Direction.W, Direction.NW
];

export function findNavPath(
    startX: number,
    startZ: number,
    goalX: number,
    goalZ: number,
    maxNodes = 5000,
): { q: number; r: number }[] {
    const start = worldToHex(startX, startZ);
    const goal = worldToHex(goalX, goalZ);

    const frags = getAllFragments();
    if (frags.length === 0) return [];

    const grid = frags[0].grid;
    const startHex = grid.getHex(start);
    const goalHex = grid.getHex(goal);

    if (!startHex || !goalHex) return [];

    // A* Pathfinding over Hex Grid
    interface Node {
        hex: Tile;
        g: number;
        f: number;
        parent: string | null;
    }

    const open: Node[] = [];
    const closedList = new Map<string, Node>();

    const h = heuristic(startHex.q, startHex.r, goalHex.q, goalHex.r);
    open.push({ hex: startHex, g: 0, f: h, parent: null });

    const goalKey = `${goalHex.q},${goalHex.r}`;

    while (open.length > 0 && closedList.size < maxNodes) {
        let bestI = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bestI].f) bestI = i;
        }
        const current = open.splice(bestI, 1)[0];
        const currentKey = `${current.hex.q},${current.hex.r}`;

        if (closedList.has(currentKey)) continue;
        closedList.set(currentKey, current);

        if (currentKey === goalKey) {
            return reconstructPath(closedList, currentKey);
        }

        for (const dir of DIRECTIONS) {
            const neighbor = grid.neighborOf(current.hex, dir, { allowOutside: false });
            if (!neighbor) continue;

            const nKey = `${neighbor.q},${neighbor.r}`;
            if (closedList.has(nKey)) continue;

            if (neighbor.biome === "mountain" || neighbor.biome === "water") continue;

            const g = current.g + 1; // cost is 1 per hex
            const f = g + heuristic(neighbor.q, neighbor.r, goal.q, goal.r);
            open.push({ hex: neighbor as Tile, g, f, parent: currentKey });
        }
    }

    return [];
}

function reconstructPath(
    closed: Map<string, any>,
    goalKey: string,
): { q: number; r: number }[] {
    const path: { q: number; r: number }[] = [];
    let currentKey: string | null = goalKey;
    while (currentKey) {
        const node = closed.get(currentKey);
        if (!node) break;
        // Don't include the start hex in the path itself
        if (node.parent !== null) {
            path.unshift({ q: node.hex.q, r: node.hex.r });
        }
        currentKey = node.parent;
    }
    return path;
}
