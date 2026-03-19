import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { a as Color, V as Vector3, B as BufferGeometry, b as BufferAttribute, L as LineDashedMaterial, c as LineBasicMaterial, d as useFrame, e as Line, f as CircleGeometry, M as MeshBasicMaterial, D as DoubleSide } from './react-three-fiber.esm-PzQKdL82.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { E as networksConfig, F as getNetworkOverlayState } from './gameState-CXdyHaTz.js';

const _colorCache = /* @__PURE__ */ new Map();
function getCachedColor(key, rgb) {
  if (!_colorCache.has(key)) {
    _colorCache.set(key, new Color(rgb[0], rgb[1], rgb[2]));
  }
  return _colorCache.get(key);
}
function computeBezierPoints(from, to, controlOffset, parallelIndex, parallelOffset, segments = 12) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len === 0) return [];
  const dirX = dx / len;
  const dirZ = dz / len;
  const perpX = -dirZ;
  const perpZ = dirX;
  const offsetX = perpX * parallelIndex * parallelOffset;
  const offsetZ = perpZ * parallelIndex * parallelOffset;
  const midX = (from.x + to.x) / 2 + perpX * controlOffset;
  const midZ = (from.z + to.z) / 2 + perpZ * controlOffset;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * (from.x + offsetX) + 2 * u * t * (midX + offsetX) + t * t * (to.x + offsetX);
    const z = u * u * (from.z + offsetZ) + 2 * u * t * (midZ + offsetZ) + t * t * (to.z + offsetZ);
    points.push(new Vector3(x, 0, z));
  }
  return points;
}
function SegmentLine({
  segment,
  elapsedTime
}) {
  const _lineRef = reactExports.useRef(null);
  const { geometry, material, yOffset, isConduit } = reactExports.useMemo(() => {
    const config = networksConfig[segment.type];
    const controlOffset = "bezierControlOffset" in config ? config.bezierControlOffset : 0.15;
    const yo = "yOffset" in config ? config.yOffset : -0.02;
    const points = computeBezierPoints(
      segment.from,
      segment.to,
      controlOffset,
      segment.parallelIndex,
      networksConfig.parallelOffset
    );
    const geom = new BufferGeometry().setFromPoints(points);
    let color;
    if (segment.type === "signal") {
      const factionColors = networksConfig.signal.factionColors[segment.faction] ?? networksConfig.signal.factionColors.neutral;
      color = getCachedColor(`signal_${segment.faction}`, factionColors);
    } else if (segment.type === "power") {
      color = getCachedColor("power", networksConfig.power.color);
    } else {
      const factionColors = networksConfig.conduit.factionColors[segment.faction] ?? networksConfig.conduit.factionColors.neutral;
      color = getCachedColor(`conduit_${segment.faction}`, factionColors);
    }
    let mat;
    if (segment.type === "conduit") {
      geom.computeBoundingSphere();
      const positions = geom.attributes.position;
      const lineDistances = new Float32Array(positions.count);
      let totalDist = 0;
      for (let i = 0; i < positions.count; i++) {
        if (i > 0) {
          const dx = positions.getX(i) - positions.getX(i - 1);
          const dy = positions.getY(i) - positions.getY(i - 1);
          const dz = positions.getZ(i) - positions.getZ(i - 1);
          totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        lineDistances[i] = totalDist;
      }
      geom.setAttribute(
        "lineDistance",
        new BufferAttribute(lineDistances, 1)
      );
      mat = new LineDashedMaterial({
        color: color.clone(),
        linewidth: 1,
        transparent: true,
        opacity: 0.9,
        dashSize: networksConfig.conduit.dashLength,
        gapSize: networksConfig.conduit.gapLength
      });
    } else {
      mat = new LineBasicMaterial({
        color: color.clone(),
        linewidth: 1,
        transparent: true,
        opacity: 0.9
      });
    }
    return {
      geometry: geom,
      material: mat,
      yOffset: yo,
      isConduit: segment.type === "conduit"
    };
  }, [
    segment.from.x,
    segment.from.z,
    segment.to.x,
    segment.to.z,
    segment.type,
    segment.faction,
    segment.parallelIndex,
    segment.from,
    segment.to
  ]);
  useFrame(() => {
    if (!material) return;
    if (segment.type === "power") {
      const minGlow = networksConfig.power.glowIntensityMin;
      const maxGlow = networksConfig.power.glowIntensityMax;
      const _intensity = minGlow + segment.throughput * (maxGlow - minGlow);
      material.opacity = 0.5 + segment.throughput * 0.4;
      if (segment.throughput < 0.1) {
        const unpowered = getCachedColor(
          "power_off",
          networksConfig.power.unpoweredColor
        );
        material.color.copy(unpowered);
        material.opacity = 0.3;
      }
    } else if (segment.type === "signal") {
      const pulse = 0.7 + 0.3 * Math.sin(
        elapsedTime * networksConfig.signal.pulseSpeed * Math.PI * 2
      );
      material.opacity = pulse * 0.8;
    } else if (segment.type === "conduit" && isConduit) {
      const dashCycle = networksConfig.conduit.dashLength + networksConfig.conduit.gapLength;
      material.dashOffset = -(elapsedTime * networksConfig.conduit.animationSpeed) % dashCycle;
      material.opacity = 0.9;
    }
  });
  const lineObj = reactExports.useMemo(() => {
    return new Line(geometry, material);
  }, [geometry, material]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("primitive", { object: lineObj, position: [0, yOffset, 0] });
}
function SegmentGlow({ segment }) {
  const { lineObj, yOffset } = reactExports.useMemo(() => {
    const config = networksConfig[segment.type];
    const controlOffset = "bezierControlOffset" in config ? config.bezierControlOffset : 0.15;
    const yo = "yOffset" in config ? config.yOffset : -0.02;
    const points = computeBezierPoints(
      segment.from,
      segment.to,
      controlOffset,
      segment.parallelIndex,
      networksConfig.parallelOffset
    );
    const geom = new BufferGeometry().setFromPoints(points);
    let color;
    if (segment.type === "signal") {
      const factionColors = networksConfig.signal.factionColors[segment.faction] ?? networksConfig.signal.factionColors.neutral;
      color = getCachedColor(`signal_${segment.faction}`, factionColors);
    } else if (segment.type === "power") {
      color = getCachedColor("power", networksConfig.power.color);
    } else {
      const factionColors = networksConfig.conduit.factionColors[segment.faction] ?? networksConfig.conduit.factionColors.neutral;
      color = getCachedColor(`conduit_${segment.faction}`, factionColors);
    }
    const mat = new LineBasicMaterial({
      color: color.clone(),
      linewidth: 1,
      transparent: true,
      opacity: 0.25
    });
    return {
      lineObj: new Line(geom, mat),
      yOffset: yo - 1e-3
    };
  }, [
    segment.from.x,
    segment.from.z,
    segment.to.x,
    segment.to.z,
    segment.type,
    segment.faction,
    segment.parallelIndex,
    segment.from,
    segment.to
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("primitive", { object: lineObj, position: [0, yOffset, 0] });
}
const _junctionGeometry = new CircleGeometry(1, 16);
_junctionGeometry.rotateX(-Math.PI / 2);
function JunctionNodeRenderer({
  junction,
  elapsedTime
}) {
  const meshRef = reactExports.useRef(null);
  const material = reactExports.useMemo(() => {
    const factionColors = networksConfig.signal.factionColors[junction.faction] ?? networksConfig.signal.factionColors.neutral;
    const color = getCachedColor(`junction_${junction.faction}`, factionColors);
    return new MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.8,
      side: DoubleSide
    });
  }, [junction.faction]);
  useFrame(() => {
    if (!meshRef.current) return;
    const jc = networksConfig.junction;
    const pulse = jc.pulseMin + (jc.pulseMax - jc.pulseMin) * (0.5 + 0.5 * Math.sin(elapsedTime * jc.pulseSpeed * Math.PI * 2));
    const dimFactor = junction.hasStructure ? jc.dimWhenStructure : 1;
    material.opacity = pulse / jc.pulseMax * 0.8 * dimFactor;
  });
  const scale = networksConfig.junction.radius;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "mesh",
    {
      ref: meshRef,
      position: [junction.x, networksConfig.signal.yOffset + 1e-3, junction.z],
      scale: [scale, scale, scale],
      geometry: _junctionGeometry,
      material
    }
  );
}
function NetworkLineRenderer() {
  const [, setRenderTrigger] = reactExports.useState(0);
  const elapsedRef = reactExports.useRef(0);
  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const state2 = getNetworkOverlayState();
    if (state2.segments.length > 0 || state2.junctions.length > 0) {
      setRenderTrigger((prev) => prev + 1);
    }
  });
  const state = getNetworkOverlayState();
  const elapsed = elapsedRef.current;
  if (state.segments.length === 0 && state.junctions.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { name: "network-overlay", children: [
    state.segments.map((seg) => /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SegmentGlow, { segment: seg }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SegmentLine, { segment: seg, elapsedTime: elapsed })
    ] }, seg.id)),
    state.junctions.map((junction, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      JunctionNodeRenderer,
      {
        junction,
        elapsedTime: elapsed
      },
      `junction_${i}`
    ))
  ] });
}

export { NetworkLineRenderer as N };
//# sourceMappingURL=NetworkLineRenderer-CZO0tNHf.js.map
