# Syntheteria Data

This directory will contain engine-agnostic game data.

## Status: Pending Redesign

The previous component data (101 components across 9 categories) and JSON schemas have been retired. The new component data needs to be designed to match the updated game setting:

- **Lightning rod power** instead of generic batteries/generators
- **Storm energy** as the primary power source
- **Coastal mine** and **deep-sea mining** resources
- **Anti-cultist** weapons and defenses (lightning resistance?)
- **Hacking equipment** as a core component category

## Planned Structure

```
data/
├── schema/               # JSON Schema definitions (TBD)
│   ├── component.schema.json
│   └── save.schema.json
├── components/           # Component data by category (TBD)
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

## Component Categories

Nine categories remain relevant:

1. **Power Sources** — Batteries, generators, lightning rod connections, storm capacitors
2. **Controllers** — Microcontrollers, CPUs, compute modules, server racks
3. **Motors** — Micro to industrial, servos, hydraulic systems
4. **Locomotion** — Wheels, treads, legs, rotors, aquatic propulsion
5. **Sensors** — Cameras, radar, lidar, sonar, environmental sensors
6. **Manipulation** — Grippers, arms, drills, welders, cutters
7. **Weapons** — Melee, ranged, area/support, electronic warfare
8. **Communication** — Radios, relay antennas, laser comm, ECM
9. **Utility** — Cargo, fuel tanks, stealth, repair kits, hacking interfaces

## Validation

Once schemas are defined, validate with:

```bash
ajv validate -s schema/component.schema.json -d "components/*.json"
```
