# Syntheteria Data

This directory contains engine-agnostic game data in JSON format.

## Structure

```
data/
├── schema/                    # JSON Schema definitions
│   └── component.schema.json  # Component data structure
├── components/                # Component definitions by category
│   ├── power_sources.json
│   ├── controllers.json
│   ├── motors.json
│   ├── locomotion.json
│   ├── sensors.json
│   ├── manipulation.json
│   ├── weapons.json
│   ├── communication.json
│   └── utility.json
└── README.md
```

## Usage

### Loading Components

All component files follow the same structure:

```json
{
  "$schema": "../schema/component.schema.json",
  "components": [
    { "id": "...", "name": "...", ... },
    { "id": "...", "name": "...", ... }
  ]
}
```

To load all components, iterate through all JSON files in the `components/` directory.

### Component Categories

| Category | Description |
|----------|-------------|
| `power_source` | Batteries, generators, fuel cells, solar panels |
| `controller` | CPUs, compute modules, server racks |
| `motor` | Motors and servos that provide torque |
| `locomotion` | Wheels, treads, legs, rotors |
| `sensor` | Cameras, radar, lidar, environmental sensors |
| `manipulation` | Grippers, arms, drills, welders |
| `weapon` | Projectile, energy, and melee weapons |
| `communication` | Radios, relays, ECM |
| `utility` | Cargo bays, fuel tanks, stealth, repair |

### Tier System

Components are rated 1-5:
- **Tier 1**: Basic, available from start
- **Tier 2**: Early game unlocks
- **Tier 3**: Mid-game technology
- **Tier 4**: Advanced, requires rare materials
- **Tier 5**: End-game, requires significant investment

### Blueprint Requirements

Components with `crafting.blueprint_required: true` must be discovered before they can be manufactured. Discovery sources:
- Memory fragments
- Enemy salvage
- Exploration

## Validation

Component files can be validated against the JSON Schema:

```bash
# Using ajv-cli
npx ajv validate -s schema/component.schema.json -d "components/*.json"
```

## Adding New Components

1. Choose the appropriate category file
2. Add a new component object to the `components` array
3. Ensure `id` is unique across all components
4. Validate against the schema

## Related Documentation

- [Core Formulas](../docs/technical/CORE_FORMULAS.md) - How component stats translate to gameplay
- [Drones](../docs/design/DRONES.md) - Design philosophy and assembly rules
- [Materials](../docs/design/MATERIALS.md) - Crafting material sources
