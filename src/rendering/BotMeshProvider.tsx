/**
 * BotMeshProvider — React hook for generating and caching procedural bot meshes.
 *
 * Uses the BotGenerator to create faction-distinct 3D bot meshes and caches
 * them by a composite key of (botType, faction, entityId). The entityId serves
 * as the seed for deterministic randomization, so the same entity always gets
 * the same mesh.
 *
 * Usage in a React Three Fiber component:
 *
 *   function BotVisual({ entity }: { entity: UnitEntity }) {
 *     const botGroup = useBotMesh(
 *       entity.unit.type,
 *       entity.faction,
 *       entity.id,
 *     );
 *     if (!botGroup) return null;
 *     return <primitive object={botGroup} />;
 *   }
 */

import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { generateBotMesh, disposeBotGroup } from "./procgen/BotGenerator.ts";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const meshCache = new Map<string, THREE.Group>();

function cacheKey(botType: string, faction: string, entityId: string | number): string {
  return `${botType}_${faction}_${entityId}`;
}

/**
 * Convert an entity ID (string or number) to an integer seed.
 * For string IDs, we use a simple djb2 hash.
 * For numeric IDs, we use them directly.
 */
function entityIdToSeed(entityId: string | number): number {
  if (typeof entityId === "number") {
    return entityId | 0;
  }

  // djb2 hash for string IDs
  let hash = 5381;
  for (let i = 0; i < entityId.length; i++) {
    hash = ((hash << 5) + hash + entityId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook that generates and caches a procedural bot mesh.
 *
 * The mesh is deterministic: the same (botType, faction, entityId) triple
 * always produces the same visual result. Meshes are cached globally so
 * re-renders of the same entity reuse the existing Group.
 *
 * The returned Group is a clone of the cached mesh, so each component instance
 * gets its own transform without sharing position/rotation state.
 *
 * Disposal is handled automatically when the component unmounts.
 *
 * @param botType  - Bot type key (e.g. "maintenance_bot", "heavy_bot")
 * @param faction  - Faction key (e.g. "reclaimers", "volt_collective")
 * @param entityId - Entity ID used as seed and cache key
 * @returns THREE.Group containing the bot mesh, or null during generation
 */
export function useBotMesh(
  botType: string,
  faction: string,
  entityId: string | number,
): THREE.Group | null {
  const key = cacheKey(botType, faction, entityId);

  const group = useMemo(() => {
    // Check cache first
    const cached = meshCache.get(key);
    if (cached) {
      return cached.clone();
    }

    // Generate new mesh
    const seed = entityIdToSeed(entityId);
    const generated = generateBotMesh(botType, faction, seed);
    meshCache.set(key, generated);

    // Return a clone so each component instance has independent transforms
    return generated.clone();
  }, [key, botType, faction, entityId]);

  // Cleanup the clone on unmount (but leave the cached original intact)
  useEffect(() => {
    return () => {
      if (group) {
        disposeBotGroup(group);
      }
    };
  }, [group]);

  return group;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/**
 * Clear the bot mesh cache and dispose all cached meshes.
 * Call this on scene teardown or when changing faction configurations.
 */
export function clearBotMeshCache(): void {
  for (const group of meshCache.values()) {
    disposeBotGroup(group);
  }
  meshCache.clear();
}

/**
 * Remove a specific bot mesh from the cache.
 * Useful when an entity changes faction or type.
 */
export function invalidateBotMesh(
  botType: string,
  faction: string,
  entityId: string | number,
): void {
  const key = cacheKey(botType, faction, entityId);
  const cached = meshCache.get(key);
  if (cached) {
    disposeBotGroup(cached);
    meshCache.delete(key);
  }
}

/**
 * Get the current number of cached bot meshes.
 * Useful for debugging memory usage.
 */
export function getBotMeshCacheSize(): number {
  return meshCache.size;
}
