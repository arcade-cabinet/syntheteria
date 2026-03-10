# Texture Selections for Factory Planet Game

All textures sourced from `/Volumes/home/assets/2DPhotorealistic/` (AmbientCG PBR library).
Resolution: 1K-JPG. Maps copied: Color, Metalness, NormalGL, Roughness (+ Opacity where applicable).
Displacement and .blend/.usdc files excluded.

---

## Cube Materials

### Rock Cubes
Raw stone/concrete rubble -- the basic terrain material.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **Concrete022** | `MATERIAL/1K-JPG/Concrete022/` | Cracked, damaged concrete with visible fracture patterns. Perfect for rubble/rock cubes that look like broken industrial foundations. Light gray with heavy surface cracking. |
| **Concrete033** | `MATERIAL/1K-JPG/Concrete033/` | Dark industrial concrete with subtle panel joint lines. Smooth but weathered -- good for intact rock surfaces or factory floor fragments. |

Maps: Color, NormalGL, Roughness (concrete has no Metalness -- use 0.0 in shader).

---

### Scrap Iron Cubes
Heavily rusted, degraded metal -- salvageable scrap.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **Rust003** | `MATERIAL/1K-JPG/Rust003/` | Uniform heavy red-brown rust with fine grain texture. Reads clearly as "old rusty metal" at any scale. Consistent coverage without bald spots. |
| **Rust005** | `MATERIAL/1K-JPG/Rust005/` | Deeper rust with dark pitting and reddish-orange patches. More aggressive corrosion look -- good for heavily degraded scrap. Visible surface erosion. |

Maps: Color, Metalness, NormalGL, Roughness.

---

### Iron Cubes
Clean-ish metal plate -- refined/processed resource.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **MetalPlates003** | `MATERIAL/1K-JPG/MetalPlates003/` | Riveted steel panels with regular bolt/rivet pattern. Bright metallic finish with clear panel seams. Reads as "manufactured metal plate" -- distinctly different from raw rust. |
| **MetalPlates008** | `MATERIAL/1K-JPG/MetalPlates008/` | Varied rectangular panel layout with mixed sizes, brushed metallic finish. More complex tiling pattern adds visual interest. Strong industrial look. |

Maps: Color, Metalness, NormalGL, Roughness.

---

### Copper Cubes
Warm orange-brown conductive metal.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **Metal035** | `MATERIAL/1K-JPG/Metal035/` | Pure polished copper/bronze with warm golden-orange metallic tone. Smooth, highly metallic. Unmistakably reads as copper at a glance. Primary copper material. |
| **PaintedMetal006** | `MATERIAL/1K-JPG/PaintedMetal006/` | Copper with green verdigris patina -- turquoise oxidation over warm copper base. Great for weathered/aged copper cubes or as a secondary variant showing environmental exposure. |

Maps: Color, Metalness, NormalGL, Roughness.

---

### Silicon Cubes
Blue-gray semiconductor/metalloid material.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **Metal030** | `MATERIAL/1K-JPG/Metal030/` | Deep blue-gray metallic with slight granular texture. Smooth, dark, cool-toned. Evokes silicon wafer or blued steel. Primary silicon material. |
| **Metal038** | `MATERIAL/1K-JPG/Metal038/` | Cool dark gray with visible surface wear and patina. Slightly rougher than Metal030. Good for unrefined or partially processed silicon variant. |

Maps: Color, Metalness, NormalGL, Roughness.

---

### Titanium Cubes
Bright, clean, premium metallic -- high-tier resource.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **MetalPlates009** | `MATERIAL/1K-JPG/MetalPlates009/` | Bright brushed stainless steel panels in a woven/basket pattern. Highly reflective, clean. Reads as premium manufactured metal. Primary titanium material. |
| **MetalPlates007** | `MATERIAL/1K-JPG/MetalPlates007/` | Polished dark metal tile grid. Regular small square panels with defined seams. Sleek and modern -- good for refined titanium. |

Maps: Color, Metalness, NormalGL, Roughness.

---

## Terrain

### Factory Floor
Industrial walkway/flooring for the factory planet surface.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **MetalWalkway004** | `MATERIAL/1K-JPG/MetalWalkway004/` | Heavy industrial grating with wide bars, showing rust through the gaps. Dark metal with warm rust accents. Excellent factory floor texture. |
| **MetalWalkway008** | `MATERIAL/1K-JPG/MetalWalkway008/` | Fine-grid metal grating. Smaller, tighter pattern than 004. Good for platforms, catwalks, or secondary floor areas. |

Maps: Color, Metalness, NormalGL, Roughness, Opacity (for transparent grating holes).

---

## Decals

### Wall Weathering / Leak Damage
Overlay decals for adding damage and age to surfaces.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **Leaking001** | `DECAL/1K-JPG/Leaking001/` | Dark water/oil stain streaks running downward. Heavy, dramatic leak pattern. Good for walls below pipes or roof edges. |
| **Leaking003** | `DECAL/1K-JPG/Leaking003/` | Green algae/moss leak streaks. Organic growth pattern over dark base. Adds biological weathering to industrial surfaces -- suggests long abandonment. |
| **Leaking006** | `DECAL/1K-JPG/Leaking006/` | Pipe drain with concrete mineral staining. Centered drain point with radiating stain. Perfect for placing at specific pipe/drain locations on walls. |

Maps: Color, NormalGL, Roughness, Opacity (for alpha-blended overlay).

---

## HDRI Environments

Sky/environment maps for the machine planet atmosphere.

| Selection | Source Path | Why Chosen |
|-----------|-----------|------------|
| **EveningSkyHDRI030A** | `HDRI/1K/EveningSkyHDRI030A/` | Heavy, dramatic storm clouds with dark overcast sky. Threatening atmosphere. Best match for the factory planet's oppressive, industrial mood. Primary environment. |
| **DaySkyHDRI020A** | `HDRI/1K/DaySkyHDRI020A/` | Fully overcast gray sky with even, diffuse lighting. No sun visible. Good for flat, dreary daytime look without harsh shadows. |
| **NightSkyHDRI005** | `HDRI/1K/NightSkyHDRI005/` | Hazy night sky with diffuse light pollution glow. Murky atmosphere. Good for night cycle or deep-factory interior ambient. |

Files: EXR (HDR data for IBL), TONEMAPPED.jpg (LDR preview), preview PNG.

---

## File Organization

```
game/assets/
  textures/
    rock/           Concrete022, Concrete033
    scrap_iron/     Rust003, Rust005
    iron/           MetalPlates003, MetalPlates008
    copper/         Metal035, PaintedMetal006
    silicon/        Metal030, Metal038
    titanium/       MetalPlates009, MetalPlates007
    terrain/        MetalWalkway004, MetalWalkway008
    decals/         Leaking001, Leaking003, Leaking006
  hdri/
    EveningSkyHDRI030A (storm)
    DaySkyHDRI020A (overcast)
    NightSkyHDRI005 (night haze)
```

## Usage Notes

- **PBR workflow:** Use Color as baseColor/albedo, Metalness for metallic channel, NormalGL for normal mapping (OpenGL convention -- Y-up), Roughness for roughness channel.
- **Concrete/Rock** materials have no Metalness map -- hardcode metalness to 0.0 in shader.
- **Walkway Opacity** maps define transparency for grating holes -- use as alpha mask.
- **Decal Opacity** maps define where the decal is visible -- use for alpha-blended overlay rendering.
- **HDRI EXR** files are 1K resolution, suitable for environment lighting (IBL) in Three.js via `RGBELoader` or `EXRLoader`.
- All textures tile seamlessly and are 1024x1024 (1K resolution).
