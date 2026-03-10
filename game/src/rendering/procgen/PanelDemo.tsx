/**
 * PanelDemo — Visual test component for the PanelGeometry system.
 *
 * Renders three example panels in a React Three Fiber scene:
 * 1. A single panel with corner bolts and an inset
 * 2. A box chassis assembled from 6 panels (front has vents, top has bolt grid)
 * 3. A panel with horizontal vent slots and edge bolts
 *
 * Mount this inside a <Canvas> to verify the procgen system works.
 *
 * Usage:
 *   import { PanelDemo } from './rendering/procgen/PanelDemo';
 *   // Inside your <Canvas>:
 *   <PanelDemo />
 */

import { useMemo } from "react";
import * as THREE from "three";
import {
  createBoxFromPanels,
  createPanel,
  type PanelOptions,
} from "./PanelGeometry.ts";

// ---------------------------------------------------------------------------
// Shared PBR material settings
// ---------------------------------------------------------------------------

const BRUSHED_STEEL = {
  color: new THREE.Color(0xb4b9c3),
  metalness: 0.9,
  roughness: 0.3,
};

const DARK_STEEL = {
  color: new THREE.Color(0x3a3d42),
  metalness: 0.85,
  roughness: 0.4,
};

const COPPER_ACCENT = {
  color: new THREE.Color(0x78b482),
  metalness: 0.6,
  roughness: 0.5,
};

// ---------------------------------------------------------------------------
// Demo 1: Single panel with bolts
// ---------------------------------------------------------------------------

function SinglePanelDemo() {
  const geometry = useMemo(() => {
    const opts: PanelOptions = {
      width: 1.5,
      height: 1.0,
      depth: 0.06,
      bevelSize: 0.03,
      insetDepth: 0.015,
      insetMargin: 0.1,
      boltPattern: "corners",
      boltRadius: 0.02,
      seamLines: 2,
    };
    return createPanel(opts);
  }, []);

  return (
    <group position={[-3, 1, 0]}>
      {/* Label post */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshStandardMaterial color={0x555555} metalness={0.8} roughness={0.4} />
      </mesh>

      {/* The panel */}
      <mesh geometry={geometry}>
        <meshStandardMaterial {...BRUSHED_STEEL} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Demo 2: Box assembled from panels
// ---------------------------------------------------------------------------

function BoxChassisDemo() {
  const geometry = useMemo(() => {
    return createBoxFromPanels(1.0, 0.8, 0.6, {
      front: {
        boltPattern: "corners",
        boltRadius: 0.018,
        insetDepth: 0.012,
        insetMargin: 0.12,
        seamLines: 1,
      },
      back: {
        boltPattern: "edges",
        boltRadius: 0.012,
        boltCount: 3,
        insetDepth: 0.008,
      },
      left: {
        ventSlots: 4,
        boltPattern: "corners",
        boltRadius: 0.01,
        insetDepth: 0.005,
      },
      right: {
        ventSlots: 4,
        boltPattern: "corners",
        boltRadius: 0.01,
        insetDepth: 0.005,
      },
      top: {
        boltPattern: "grid",
        boltCount: 3,
        boltRadius: 0.01,
        insetDepth: 0.01,
        insetMargin: 0.15,
      },
      bottom: {
        boltPattern: "none",
        insetDepth: 0,
      },
    });
  }, []);

  return (
    <group position={[0, 1, 0]}>
      {/* Pedestal */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.4, 8]} />
        <meshStandardMaterial color={0x444444} metalness={0.8} roughness={0.5} />
      </mesh>

      {/* The chassis box */}
      <mesh geometry={geometry}>
        <meshStandardMaterial {...DARK_STEEL} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Demo 3: Vent panel with edge bolts
// ---------------------------------------------------------------------------

function VentPanelDemo() {
  const geometry = useMemo(() => {
    const opts: PanelOptions = {
      width: 1.2,
      height: 1.4,
      depth: 0.08,
      bevelSize: 0.025,
      insetDepth: 0.02,
      insetMargin: 0.06,
      boltPattern: "edges",
      boltRadius: 0.015,
      boltCount: 4,
      ventSlots: 6,
      ventVertical: false,
    };
    return createPanel(opts);
  }, []);

  return (
    <group position={[3, 1, 0]}>
      {/* Label post */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
        <meshStandardMaterial color={0x555555} metalness={0.8} roughness={0.4} />
      </mesh>

      {/* The vent panel */}
      <mesh geometry={geometry}>
        <meshStandardMaterial {...COPPER_ACCENT} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Demo scene
// ---------------------------------------------------------------------------

/**
 * Full demo component. Drop inside a <Canvas> to see three example panels.
 *
 * Includes its own lighting so it works standalone, but can also use
 * the parent scene's lights.
 */
export function PanelDemo() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial
          color={0x222222}
          metalness={0.3}
          roughness={0.9}
        />
      </mesh>

      {/* Demo panels */}
      <SinglePanelDemo />
      <BoxChassisDemo />
      <VentPanelDemo />

      {/* Scene lighting (self-contained so demo works standalone) */}
      <ambientLight intensity={0.3} color={0x8899aa} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.2}
        color={0xffffff}
        castShadow
      />
      <pointLight
        position={[-3, 3, 2]}
        intensity={0.4}
        color={0x88aaff}
      />
    </group>
  );
}
