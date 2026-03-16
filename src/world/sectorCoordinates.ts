export interface SectorWorldDimensions {
	width: number;
	height: number;
}

export const SECTOR_LATTICE_SIZE = 2;

let worldDimensions: SectorWorldDimensions = { width: 40, height: 40 };

export function gridToWorld(q: number, r: number) {
	return {
		x: q * SECTOR_LATTICE_SIZE,
		y: 0,
		z: r * SECTOR_LATTICE_SIZE,
	};
}

export function worldToGrid(x: number, z: number) {
	return {
		q: Math.round(x / SECTOR_LATTICE_SIZE),
		r: Math.round(z / SECTOR_LATTICE_SIZE),
	};
}

export function setWorldDimensions(dimensions: SectorWorldDimensions) {
	worldDimensions = { ...dimensions };
}

export function getWorldDimensions() {
	return { ...worldDimensions };
}

export function getWorldHalfExtents() {
	return {
		x: (worldDimensions.width * SECTOR_LATTICE_SIZE) / 2,
		z: (worldDimensions.height * SECTOR_LATTICE_SIZE) / 2,
	};
}

export function resetWorldDimensions() {
	worldDimensions = { width: 40, height: 40 };
}
