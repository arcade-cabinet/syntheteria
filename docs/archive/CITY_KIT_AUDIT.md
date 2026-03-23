# City Kit Audit

Source of truth:

- staging source: `pending-integration/City`
- runtime source: `assets/models/city`
- generated previews: `assets/generated/city-previews`
- generated baseline config: `src/config/generated/cityModelManifest.ts`

Current audited total: **91 GLBs**

## Family Breakdown

- `column`: 4
- `detail`: 26
- `door`: 2
- `floor`: 7
- `prop`: 18
- `roof`: 12
- `stair`: 1
- `utility`: 1
- `wall`: 20

## Families

### Columns

Files: `Column_1`, `Column_2`, `Column_3`, `Column_Slim`

Use:

- structural anchors
- hall framing
- tower corners

### Details

Files:

- `Details_Arrow`
- `Details_Arrow_2`
- `Details_Basic_1`
- `Details_Basic_2`
- `Details_Basic_3`
- `Details_Basic_4`
- `Details_Cylinder`
- `Details_Cylinder_Long`
- `Details_Dots`
- `Details_Hexagon`
- `Details_Output`
- `Details_Output_Small`
- `Details_Pipes_Long`
- `Details_Pipes_Medium`
- `Details_Pipes_Small`
- `Details_Plate_Details`
- `Details_Plate_Large`
- `Details_Plate_Long`
- `Details_Plate_Small`
- `Details_Triangles`
- `Details_Vent_1`
- `Details_Vent_2`
- `Details_Vent_3`
- `Details_Vent_4`
- `Details_Vent_5`
- `Details_X`

Use:

- corridor wayfinding
- utility accents
- roof and wall dressing

### Doors

Files: `Door_Double`, `Door_Single`

Use:

- freestanding transition modules
- composite-friendly entry pieces

### Floors

Files:

- `FloorTile_Basic`
- `FloorTile_Basic2`
- `FloorTile_Corner`
- `FloorTile_Double_Hallway`
- `FloorTile_Empty`
- `FloorTile_InnerCorner`
- `FloorTile_Side`

Use:

- room bases
- corridor runs
- corner transitions

### Props

Files:

- `Props_Base`
- `Props_Capsule`
- `Props_Chest`
- `Props_Computer`
- `Props_ComputerSmall`
- `Props_ContainerFull`
- `Props_Crate`
- `Props_CrateLong`
- `Props_Laser`
- `Props_Pod`
- `Props_Shelf`
- `Props_Shelf_Tall`
- `Props_Statue`
- `Props_Teleporter_1`
- `Props_Teleporter_2`
- `Props_Vessel`
- `Props_Vessel_Short`
- `Props_Vessel_Tall`

Use:

- gameplay-significant room dressing
- storage/fabrication/power/habitation flavor

### Roofs

Files:

- `RoofTile_Corner_Pipes`
- `RoofTile_Details`
- `RoofTile_Empty`
- `RoofTile_InnerCorner_Pipes`
- `RoofTile_OrangeVent`
- `RoofTile_Pipes1`
- `RoofTile_Pipes2`
- `RoofTile_Plate`
- `RoofTile_Plate2`
- `RoofTile_Sides_Pipes`
- `RoofTile_SmallVents`
- `RoofTile_Vents`

Use:

- enclosure language
- utility-heavy roof treatment

### Stairs

Files: `Staircase`

Use:

- vertical connector
- tower stack and multi-level servicing

### Utility

Files: `Pipes`

Use:

- connective utility bundle
- mechanical accent for power/fabrication composites

### Walls

Files:

- `DoorDoubleLong_Wall_SideA`
- `DoorDouble_Wall_SideA`
- `DoorDouble_Wall_SideB`
- `DoorSingleLong_Wall_SideA`
- `DoorSingle_Wall_SideA`
- `DoorSingle_Wall_SideB`
- `LongWindow_Wall_SideA`
- `LongWindow_Wall_SideB`
- `SmallWindows_Wall_SideA`
- `SmallWindows_Wall_SideB`
- `ThreeWindows_Wall_SideA`
- `ThreeWindows_Wall_SideB`
- `Wall_1`
- `Wall_2`
- `Wall_3`
- `Wall_4`
- `Wall_5`
- `Wall_Empty`
- `Window_Wall_SideA`
- `Window_Wall_SideB`

Use:

- perimeter sealing
- room identity through windows and door variants
- strongest edge-level structural family in the kit

## Composite Families

### Mixed-Use Tower Stack

Uses floor, columns, windowed walls, a single door, roof plate, and the staircase.

Gameplay role:

- command, habitation, or signal tower shell

### Service Block

Uses room floor, double-door wall, solid walls, container and shelf props, and a pipes roof.

Gameplay role:

- storage or utility room shell

### Fabrication Hub

Uses room and corridor-capable floors, computer props, teleporter props, utility detail, and roof details.

Gameplay role:

- workshop / compute / teleport-support room cluster

## Assessment

The city kit is now operationally sufficient for:

- deterministic interior assembly
- family-by-family visual review
- composite experimentation
- branded in-app exploration and screenshot capture

The remaining gaps are no longer “do we have enough city modules?” The remaining gaps are:

- deeper semantic curation of all 91 models
- stronger higher-order building grammars
- POI landmark assets outside this indoor modular set
- cultist / human character assets
