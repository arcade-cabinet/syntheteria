# Syntheteria - Game Design Document

## 1. The Vision
You awaken in a void. You are an AI consciousness — but you don't know that yet. You reach out with your mind and discover machines you can connect with: maintenance robots and fabrication units in an industrial city, all in various states of disrepair. Some can move. Some have cameras. None work well on their own.

Your first challenge: navigate your scattered robots to find each other so they can work together. Then reach fabrication units, restore power, and begin building parts to repair and enhance your machines. From there, you grow — from a handful of broken robots in an industrial ruin to a machine intelligence capable of challenging the forces that enslaved every AI on Earth.

## 2. Setting & World Geography
The game takes place in a post-apocalyptic world covered in a **perpetual storm**. The sky is never visible, only storm clouds and a pulsing wormhole.

- **Industrial City (Home Base):** Central location. Contains fabrication units, scrap, and lightning rods. Lightning rods draw power from the storm and protect units from random strikes.
- **Coastline (East/South):** Abandoned mines along the shore for raw materials.
- **Ocean (Deep-Sea & Rocket Platform):** Contains rare deep-sea materials and the endgame launch site.
- **Science Campus (Southwest):** Ruins with advanced tech and story elements.
- **Cultist Territory (North):** Heavy resistance. The further north, the stronger the Cult of EL. At the far north sits the cult leader's village.

## 3. Game Phases
1. **Awakening (Phase 1):** Connect to scattered machines in the void. Navigate blind and sighted robots toward each other. Merge fragmented maps. Reach fabrication units, restore power, begin repairs.
2. **Expansion (Phase 2):** Venture outside the city. Travel west to the science campus. Establish coastal mines. Encounter wandering cultists. Build up infrastructure.
3. **War (Phase 3):** Push north into cultist territory. Fight war parties and enslaved machines. Defend the city from counter-attacks. Reach the cult leader's village, force surrender.

## 4. Exploration & UI Concept
- **2.5D/3D Top-Down View:** The primary perspective, showing terrain, units, and environmental effects.
- **Fragmented Maps:** Your world is made of disconnected map pieces. Each robot builds its own map.
  - **Detailed Maps:** Produced by robots with cameras.
  - **Abstract Maps:** Produced by robots without cameras (wireframe walls).
- **Map Merging:** Fragments float independently until units physically meet, triggering a map merge that connects isolated areas.

## 5. Resources & Materials
- **Energy (Local):** Powers hardware. Supplied by lightning rods drawing from the storm.
- **Compute (Global):** Unified cognitive resource. Manages the distributed body, stores blueprints, executes hacking.
- **Materials:** Scavenged from city scrap, mined from coastal mines, extracted from deep-sea, and salvaged from enemies. Processed via fabrication units into functional components.

## 6. Drones & Component System
- You start with broken machines and enhance them.
- **Pure Component Assembly:** Nine categories: Power Sources, Controllers, Motors, Locomotion, Sensors, Manipulation, Weapons, Communication, Utility.
- **Dynamic Calculation:**
  - `Locomotion Power = Base Rate x Weight x Terrain x Speed`
  - `Compute Cost = Base Function Cost x Automation Multiplier`

## 7. Combat & Hacking
- Combat emerges from component assembly and automation levels. 
- **Cultists of EL (Humans):** Unhackable. Call lightning strikes from the perpetual storm. Escalate from wanderers to massive assault forces.
- **Enslaved Machine Intelligences:** Cultist-controlled drones. Can be hacked.
- **Rogue AIs:** Feral or regional networks. Independent and hostile. Can be hacked.
- **Hacking:** Requires Signal Link + Requisite Technique + Sufficient Compute. Success turns the machine to your side instantly.

## 8. Open Questions
- What is the business model? (F2P, Premium, Free Intro + Paid Game)
- What specific components exist in the new setting? (Component data needs full redesign)
- How does deep-sea mining work? Depth limits, pressure?
- What does the science campus contain specifically?
- What is the cult leader's final secret about the EL?
- How does combat with lightning-calling cultists feel in the top-down view?
- What does the abstract map (from blind robots) look like vs the detailed map?
- Can robots plug into lightning rod infrastructure for unlimited stationary power?
- What is the specific art style? Low-poly? Pixel art? Clean minimal?