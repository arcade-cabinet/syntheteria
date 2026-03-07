/**
 * Renders all map fragments. Each fragment is a group positioned by its displayOffset.
 * Chunks within each fragment are rendered based on their fog state.
 */
import { useSyncExternalStore } from "react"
import { subscribe, getSnapshot } from "../ecs/gameState"
import { DetailedChunkMesh, AbstractChunkMesh } from "./ChunkMesh"
import type { Chunk } from "../ecs/fragments"

function ChunkRenderer({ chunk, fragmentOffsetX, fragmentOffsetZ }: {
  chunk: Chunk
  fragmentOffsetX: number
  fragmentOffsetZ: number
}) {
  if (!chunk.hasRevealed) return null

  // Check if chunk has any detailed tiles
  let hasDetailed = false
  let hasAbstract = false
  for (let y = 0; y < chunk.fog.length; y++) {
    for (let x = 0; x < chunk.fog[y].length; x++) {
      if (chunk.fog[y][x] === "detailed") hasDetailed = true
      if (chunk.fog[y][x] === "abstract") hasAbstract = true
    }
  }

  return (
    <>
      {hasDetailed && (
        <DetailedChunkMesh
          chunk={chunk}
          offsetX={fragmentOffsetX}
          offsetZ={fragmentOffsetZ}
        />
      )}
      {hasAbstract && !hasDetailed && (
        <AbstractChunkMesh
          chunk={chunk}
          offsetX={fragmentOffsetX}
          offsetZ={fragmentOffsetZ}
        />
      )}
      {hasAbstract && hasDetailed && (
        <AbstractChunkMesh
          chunk={chunk}
          offsetX={fragmentOffsetX}
          offsetZ={fragmentOffsetZ}
        />
      )}
    </>
  )
}

export function FragmentRenderer() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  return (
    <>
      {snap.fragments.map((fragment) => (
        <group key={fragment.id}>
          {Array.from(fragment.chunks.values()).map((chunk) => (
            <ChunkRenderer
              key={chunk.id}
              chunk={chunk}
              fragmentOffsetX={fragment.displayOffset.x}
              fragmentOffsetZ={fragment.displayOffset.y}
            />
          ))}
        </group>
      ))}
    </>
  )
}
