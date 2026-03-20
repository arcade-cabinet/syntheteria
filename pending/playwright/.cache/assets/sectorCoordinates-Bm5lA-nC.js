const SECTOR_LATTICE_SIZE = 2;
let worldDimensions = { width: 40, height: 40 };
function gridToWorld(q, r) {
  return {
    x: q * SECTOR_LATTICE_SIZE,
    y: 0,
    z: r * SECTOR_LATTICE_SIZE
  };
}
function worldToGrid(x, z) {
  return {
    q: Math.round(x / SECTOR_LATTICE_SIZE),
    r: Math.round(z / SECTOR_LATTICE_SIZE)
  };
}
function setWorldDimensions(dimensions) {
  worldDimensions = { ...dimensions };
}
function getWorldDimensions() {
  return { ...worldDimensions };
}
function getWorldHalfExtents() {
  return {
    x: worldDimensions.width * SECTOR_LATTICE_SIZE / 2,
    z: worldDimensions.height * SECTOR_LATTICE_SIZE / 2
  };
}
function resetWorldDimensions() {
  worldDimensions = { width: 40, height: 40 };
}

export { SECTOR_LATTICE_SIZE as S, gridToWorld as g, setWorldDimensions as s, worldToGrid as w };
//# sourceMappingURL=sectorCoordinates-Bm5lA-nC.js.map
