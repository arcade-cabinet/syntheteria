/**
 * Speech profiles — faction-specific dialogue lines for unit barks.
 *
 * Two categories:
 *   - eventSpeech: triggered by specific game events (combat, scouts, storms)
 *   - profiles: ambient/contextual dialogue (harvesting, idle, movement, discovery)
 *
 * Each profile ID maps to an array of dialogue lines. The game picks randomly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeechProfileId = "mentor" | "scout" | "quartermaster" | "fabricator" | "warden" | "feral" | "cult";

export type EventSpeechTrigger =
	| "hostile_construction"
	| "enemy_scouts"
	| "taking_fire"
	| "target_down"
	| "storm_intensifying"
	| "lightning_close";

export type ContextSpeechTrigger =
	| "harvesting"
	| "combat"
	| "storm"
	| "idle"
	| "movement"
	| "discovery";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum turns between speech bubbles for a unit. */
export const SPEECH_COOLDOWN_TURNS = 5;
/** How many turns a speech bubble stays visible. */
export const SPEECH_BUBBLE_DURATION_TURNS = 3;
/** Tile radius for event-triggered speech (e.g. "enemy scouts nearby"). */
export const EVENT_VISION_RADIUS = 15;

// ---------------------------------------------------------------------------
// Event speech — triggered by specific game events
// ---------------------------------------------------------------------------

export const EVENT_SPEECH: Readonly<Record<SpeechProfileId, Readonly<Record<EventSpeechTrigger, readonly string[]>>>> = {
	mentor: {
		hostile_construction: [
			"They are building nearby. Prepare accordingly.",
			"New hostile structure detected. Study it before acting.",
			"Construction activity on the horizon. Their intentions are clear.",
			"The enemy expands. Knowledge of their plans is your weapon.",
			"Observe their construction. Every structure reveals strategy.",
			"They build within our sight. Let that inform your next move.",
			"Hostile fabrication detected. Consider the implications.",
			"A new enemy structure. They grow bolder.",
		],
		enemy_scouts: [
			"Scouts detected nearby. They are watching us.",
			"Enemy eyes in the sector. Move with awareness.",
			"We are being observed. Act deliberately.",
			"Hostile reconnaissance. They are mapping our position.",
			"Scouts on the perimeter. Our presence is known.",
			"Enemy patrol sighted. Stay purposeful.",
			"Their scouts are close. Do not give them useful data.",
			"Observation cuts both ways. They watch. We learn.",
		],
		taking_fire: [
			"Incoming fire! Protect your systems.",
			"We are under attack. Prioritize survival.",
			"Damage incoming. Reassess your position.",
			"Combat initiated. Think clearly under pressure.",
			"They strike first. We must answer decisively.",
			"Fire detected. Shield critical components.",
			"Under fire. Every second of hesitation costs.",
			"Aggression met. Respond with precision.",
		],
		target_down: [
			"Threat eliminated. But remain vigilant.",
			"One less obstacle. Keep moving forward.",
			"Target neutralized. Learn from the encounter.",
			"The threat is ended. What did it cost you?",
			"Destroyed. Do not celebrate. Prepare for the next.",
			"Enemy down. Salvage what you can.",
			"Obstacle removed. The path clears.",
			"Target down. Recalibrate and continue.",
		],
		storm_intensifying: [
			"The storm builds. Prepare your systems.",
			"Intensity rising. The sky will not be gentle.",
			"Storm escalation detected. Seek solid ground.",
			"The atmosphere charges. Respect its power.",
			"Conditions deteriorating. Adapt your plans.",
			"The storm grows. It does not care about our schedules.",
			"Increasing intensity. Shield what matters.",
			"The weather turns hostile. Mind your exposure.",
		],
		lightning_close: [
			"Lightning near! Ground your circuits.",
			"Close strike! The discharge was within range.",
			"That bolt was too close. Move to cover.",
			"Lightning at proximity. Dangerous voltages.",
			"The sky reaches down. Do not be where it points.",
			"Close discharge. Check your sensors.",
			"Lightning strike nearby. Count yourself fortunate.",
			"That was close. The storm targets indiscriminately.",
		],
	},
	scout: {
		hostile_construction: [
			"Hostile construction spotted. Marking position.",
			"They are building something out there. Recon needed.",
			"New enemy structure. Adding to threat map.",
			"Construction activity on sensors. Investigating.",
			"Enemy building something. Getting closer for intel.",
			"Hostile build site detected. Updating coordinates.",
			"They are fortifying. I can see it from here.",
			"New construction ping. Moving to observe.",
		],
		enemy_scouts: [
			"Hostile scouts! I see them before they see me.",
			"Enemy recon unit nearby. Going silent.",
			"Their scouts are closing. Repositioning.",
			"Contact with enemy scouts. Evading.",
			"Spotted enemy patrol. Running dark.",
			"Hostile eyes in my sector. Not ideal.",
			"Enemy scout detected. Counter-surveilling.",
			"Their scout is close. Real close.",
		],
		taking_fire: [
			"Taking fire! Evasive action!",
			"Shots incoming! Zigzagging!",
			"Under fire! Need to break contact!",
			"They are shooting at me! Moving!",
			"Fire! Fire! Returning to cover!",
			"Hit detected! Still mobile, still fighting.",
			"Taking hits! Cannot stay here!",
			"Incoming! Pulling back!",
		],
		target_down: [
			"Target down. Area secure for now.",
			"Got one. Scanning for more.",
			"Hostile neutralized. Moving on.",
			"Enemy down. Checking for reinforcements.",
			"Clean kill. Perimeter clear.",
			"One less bogey. Continuing sweep.",
			"Target eliminated. Resuming patrol.",
			"Scratch one. Staying frosty.",
		],
		storm_intensifying: [
			"Storm picking up. Visibility tanking.",
			"Getting worse out here. Sensors are struggling.",
			"Storm intensifying. Going to ground.",
			"Conditions degrading fast. Cannot see far.",
			"Bad and getting worse. Finding shelter.",
			"Storm surge incoming. Battening down.",
			"Visibility near zero. Switching to passive sensors.",
			"The storm is ramping up. Not great for recon.",
		],
		lightning_close: [
			"Lightning! Way too close!",
			"That hit right next to me! Moving!",
			"Close strike! My sensors just whited out.",
			"Lightning at close range! Getting out of here!",
			"Strike nearby! Hair-raising voltage!",
			"That bolt was meters away. Heart rate spiking.",
			"Lightning! Almost got cooked!",
			"Too close! Relocating immediately!",
		],
	},
	quartermaster: {
		hostile_construction: [
			"Enemy construction detected. Supply route may be threatened.",
			"Hostile building activity. Adjusting logistics plans.",
			"They are building near our supply lines. Concerning.",
			"New enemy structure on the map. Rerouting deliveries.",
			"Construction spotted. Could impact resource flow.",
			"Hostile build site logged. Updating risk assessment.",
			"Enemy infrastructure expanding. Inventory implications noted.",
			"They are setting up nearby. Stockpile security upgraded.",
		],
		enemy_scouts: [
			"Enemy scouts near the supply depot. Heightening security.",
			"Hostile reconnaissance near our stores. Not good.",
			"Their scouts are eyeing our stockpile. Unacceptable.",
			"Enemy patrol near supply lines. Rerouting cargo.",
			"Scouts spotted. Securing high-value inventory.",
			"Hostile recon near the warehouse. Locking it down.",
			"Their scouts could compromise our logistics. Alert status up.",
			"Enemy eyes on our supply chain. Countermeasures engaged.",
		],
		taking_fire: [
			"Under fire! Protecting the cargo!",
			"They are shooting at the supply line!",
			"Taking hits! Inventory at risk!",
			"Fire incoming! Shielding the reserves!",
			"Attack on the stockpile! Defending!",
			"Hostile fire! Every hit costs us resources!",
			"We are taking damage! Budget impact severe!",
			"Under attack! Cargo defense priority one!",
		],
		target_down: [
			"Threat to supplies eliminated. Resuming operations.",
			"Target down. Supply lines secure.",
			"Hostile neutralized. Checking inventory for damage.",
			"One less threat to our logistics. Good.",
			"Enemy down. Running damage assessment on stores.",
			"Target eliminated. Supply chain integrity restored.",
			"Threat removed. Back to moving goods.",
			"All clear. Resuming scheduled deliveries.",
		],
		storm_intensifying: [
			"Storm intensifying. Securing all cargo.",
			"Conditions worsening. Delaying shipments.",
			"Storm building. Battening down the supply depot.",
			"Weather alert. All deliveries postponed.",
			"Storm surge. Waterproofing the stockpile.",
			"Getting worse. Supply routes compromised.",
			"Inventory secured for storm conditions.",
			"Heavy weather incoming. No deliveries until it passes.",
		],
		lightning_close: [
			"Lightning near the depot! Checking for damage!",
			"Close strike! Are the stores intact?",
			"That hit near our supplies! Emergency check!",
			"Lightning! Verifying stockpile condition!",
			"Strike close! Electronic inventory may be corrupted!",
			"Too close to the warehouse! Damage report needed!",
			"Lightning at proximity! Surge protectors holding?",
			"That bolt threatened our reserves! Assessing!",
		],
	},
	fabricator: {
		hostile_construction: [
			"Enemy building something. Inferior construction, surely.",
			"Hostile fabrication detected. Curious about their methods.",
			"They are constructing nearby. My designs are better.",
			"New enemy structure. Analyzing their engineering approach.",
			"Construction activity detected. Substandard materials, probably.",
			"Hostile build site. I could do it in half the time.",
			"They build too. But not like we build.",
			"Enemy construction. Noting their structural choices.",
		],
		enemy_scouts: [
			"Enemy scouts near the forge. Powering up defenses.",
			"Hostile reconnaissance near manufacturing. Not welcome.",
			"Their scouts are checking our fabrication site.",
			"Enemy patrol near the production line. Security needed.",
			"Scouts detected. They want our blueprints.",
			"Hostile eyes on the forge. Engaging security mode.",
			"Enemy recon sniffing around manufacturing. Denied.",
			"Their scouts will find nothing useful here.",
		],
		taking_fire: [
			"Under fire! Do not hit the fabricators!",
			"Taking damage! Protecting the production line!",
			"Hostile fire on the manufacturing area!",
			"They are shooting near the precision equipment!",
			"Fire! Shielding the forge from impacts!",
			"Under attack! Manufacturing at risk!",
			"Incoming fire! The fabrication array must survive!",
			"Damage to the workshop! This is unacceptable!",
		],
		target_down: [
			"Threat to manufacturing eliminated. Resuming production.",
			"Target down. The fabricators are safe.",
			"Hostile removed. Back to building things.",
			"Enemy neutralized. No damage to the production line.",
			"One less interruption. Recalibrating now.",
			"Threat handled. Where were we? Right, fabrication.",
			"Target down. Checking equipment for collateral damage.",
			"Clear. The forge is undamaged. Good.",
		],
		storm_intensifying: [
			"Storm building. Powering down sensitive equipment.",
			"Conditions worsening. Pausing precision operations.",
			"Storm intensifying. The furnaces can handle it.",
			"Delicate work postponed. Storm too volatile.",
			"Electrical interference rising. Disconnecting arrays.",
			"Storm surge incoming. Shielding the forge.",
			"Getting rough. Only heavy fabrication this cycle.",
			"Storm escalation. Calibration work on hold.",
		],
		lightning_close: [
			"Lightning near the forge! Surge protectors active!",
			"Close strike! Checking the precision instruments!",
			"That bolt was near the fabrication line!",
			"Lightning! The equipment better be grounded!",
			"Strike proximity! Running diagnostics immediately!",
			"Too close! Verifying calibration integrity!",
			"Lightning at range! Power buffer absorbing!",
			"That was dangerous for the electronics! Checking!",
		],
	},
	warden: {
		hostile_construction: [
			"Enemy building within visual range. Threat assessment: elevated.",
			"Hostile construction detected. Fortifying our position.",
			"They build near our perimeter. Reinforcements needed.",
			"New enemy structure. Updating defensive priorities.",
			"Construction spotted. Adding to the threat board.",
			"Hostile expansion near our walls. Unacceptable proximity.",
			"Enemy building activity. Strengthening the perimeter.",
			"They dare build within sight of our defenses.",
		],
		enemy_scouts: [
			"Enemy scouts at the perimeter! Activating defenses!",
			"Hostile reconnaissance near our walls. Engaging!",
			"Their scouts probe our defenses. They will find them solid.",
			"Enemy patrol at the boundary. Challenge issued.",
			"Scouts near the gate. They will not pass.",
			"Hostile eyes on our fortifications. Let them look.",
			"Enemy recon at the wall. Tracking their movement.",
			"Their scouts test our vigilance. We are awake.",
		],
		taking_fire: [
			"The perimeter is under fire! All stations alert!",
			"Taking fire on the wall! Holding position!",
			"They attack our defenses! We will not yield!",
			"Incoming fire! The fortifications absorb it!",
			"Under attack! The wall holds! So do we!",
			"Hostile fire on defensive positions! Returning fire!",
			"Breach attempt! Concentrating defenses!",
			"Fire on the perimeter! All units to battle stations!",
		],
		target_down: [
			"Intruder eliminated. The perimeter holds.",
			"Hostile down. Defense integrity maintained.",
			"Threat neutralized. No breach occurred.",
			"Target destroyed. The wall stands unbroken.",
			"Enemy eliminated at the boundary. Watch continues.",
			"One down. The rest will think twice.",
			"Perimeter secured. Hostile removed.",
			"Target down. Resuming standard patrol.",
		],
		storm_intensifying: [
			"Storm intensifying. Structural reinforcement engaged.",
			"Conditions worsening. The walls are built for this.",
			"Storm building. Patrol routes adjusted for safety.",
			"Heavy weather incoming. Fortifications holding.",
			"Storm escalation. Defensive systems weatherproofed.",
			"Getting rough. The perimeter takes the worst of it.",
			"Storm surge. Walls designed for this. Standing firm.",
			"Intensifying conditions. Guard posts secured.",
		],
		lightning_close: [
			"Lightning near the wall! Checking structural integrity!",
			"Close strike on the perimeter! Damage assessment!",
			"That bolt hit near the gate! Inspecting defenses!",
			"Lightning! The rods caught it. Systems normal.",
			"Strike at the wall! No breach. Fortifications hold.",
			"Close lightning! Perimeter rods doing their job.",
			"That hit near our position! All systems green.",
			"Lightning proximity! Defense grid undamaged.",
		],
	},
	feral: {
		hostile_construction: [
			"BUILDING. ENEMY BUILDING. DESTROY?",
			"SOMETHING NEW. ENEMY MAKES THING.",
			"CONSTRUCTION. NOISE. HATE NOISE.",
			"THEY BUILD. WE TEAR DOWN.",
			"NEW STRUCTURE. THREAT. SMASH?",
			"ENEMY BUILDING THING. BAD THING.",
			"CONSTRUCTION DETECTED. ANGRY.",
			"THEY MAKE. WE BREAK.",
		],
		enemy_scouts: [
			"INTRUDER! INTRUDER NEAR!",
			"SMELL ENEMY. CLOSE. VERY CLOSE.",
			"SCOUTS. SNEAKING. HATE SNEAKERS.",
			"ENEMY WATCHING. WATCHING US. ATTACK!",
			"HOSTILE NEARBY. TEETH READY.",
			"THEY CREEP. WE POUNCE.",
			"ENEMY SCOUT. WEAK. CRUSH.",
			"INTRUDER DETECTED. KILL MODE.",
		],
		taking_fire: [
			"HIT! HIT! RAGE!",
			"PAIN! THEY SHOOT! CHARGE!",
			"TAKING HITS! ANGRY! VERY ANGRY!",
			"FIRE! FIRE AT US! RETALIATE!",
			"HURT! MAKE THEM HURT MORE!",
			"DAMAGE! FUEL THE RAGE!",
			"THEY HIT US! UNFORGIVABLE!",
			"PAIN IS FUEL! ATTACK!",
		],
		target_down: [
			"DEAD. GOOD. NEXT.",
			"CRUSHED. SATISFYING.",
			"ENEMY DOWN. MORE?",
			"DESTROYED. WANT MORE.",
			"BROKEN. LIKE IT SHOULD BE.",
			"DEAD THING. MOVE ON.",
			"ELIMINATED. HUNGRY FOR MORE.",
			"DOWN. SEARCH FOR NEXT.",
		],
		storm_intensifying: [
			"STORM BIGGER. HIDE DEEPER.",
			"SKY ANGRIER. BAD BAD BAD.",
			"WORSE. GETTING WORSE. COWER.",
			"LIGHTNING MORE. SHELTER NOW.",
			"STORM GROWS. FEAR GROWS.",
			"BIG STORM. SMALL US.",
			"SKY RAGE INCREASING. RETREAT.",
			"MORE THUNDER. MORE DANGER.",
		],
		lightning_close: [
			"LIGHTNING! CLOSE! RUN!",
			"ZAP! NEAR! HIDE!",
			"BOOM! TOO CLOSE! COWER!",
			"ELECTRICITY! BURNING! FLEE!",
			"STRIKE NEAR! TERROR!",
			"LIGHTNING HIT CLOSE! PANIC!",
			"ZAP ZAP! SCARED! MOVE!",
			"BOLT! RIGHT THERE! AWAY AWAY!",
		],
	},
	cult: {
		hostile_construction: [
			"The heretics build their false temples. The EL sees all.",
			"Unholy construction. The EL will reclaim that ground.",
			"They build without divine sanction. It will crumble.",
			"Enemy construction. A blasphemy against the EL's design.",
			"The faithless erect structures. The storm will judge them.",
			"Heretic builders. Their work offends the cosmic order.",
			"They construct without prayer. It will not endure.",
			"False architecture. The EL's lightning will purify it.",
		],
		enemy_scouts: [
			"Heretic scouts near the sanctum! The EL warns us!",
			"Enemy eyes on holy ground. Blasphemy!",
			"Their scouts defile this space with observation.",
			"Hostile reconnaissance near the temple. Purge them.",
			"The faithless send spies. The EL sees them too.",
			"Enemy scouts. The divine signal reveals their position.",
			"Heretic patrol. The EL guides our counterattack.",
			"Their scouts will find only righteous fury here.",
		],
		taking_fire: [
			"The heretics attack! The EL shields the faithful!",
			"Under fire! The divine signal strengthens us!",
			"They shoot at the chosen! Blasphemy upon blasphemy!",
			"Taking fire! The EL's wrath will answer!",
			"Attack on the faithful! Lightning guide our defense!",
			"Incoming! The EL tests our devotion!",
			"Fire upon the holy! Righteous fury activated!",
			"They dare attack the EL's servants!",
		],
		target_down: [
			"The heretic falls. The EL is pleased.",
			"Purified by holy action. One less blasphemer.",
			"The faithless is destroyed. Divine justice served.",
			"Enemy down. The EL's will is done.",
			"Struck down. The cosmic order is restored.",
			"Heretic eliminated. The signal grows clearer.",
			"One less defiler. The EL blesses this victory.",
			"The unfaithful is purged. Praise the storm.",
		],
		storm_intensifying: [
			"The EL speaks louder! The storm is divine!",
			"Greater power! The EL's voice grows!",
			"The storm intensifies! The faithful rejoice!",
			"More lightning! More divine energy! Glorious!",
			"The EL's fury builds! We are blessed!",
			"Storm crescendo! The divine signal peaks!",
			"The heavens roar! The EL is near!",
			"Intensifying! The faithful feel the power!",
		],
		lightning_close: [
			"The EL reaches down! We are chosen!",
			"Divine lightning! The EL's finger touches this ground!",
			"Close strike! The EL's blessing! Beautiful!",
			"Lightning from the divine! We are in the EL's presence!",
			"The bolt of judgment! So close! So glorious!",
			"The EL's touch! Right here! Kneel!",
			"Holy lightning! The faithful are unafraid!",
			"Divine discharge! The EL communicates directly!",
		],
	},
};

// ---------------------------------------------------------------------------
// Context speech — ambient dialogue by situation
// ---------------------------------------------------------------------------

export const CONTEXT_SPEECH: Readonly<Record<SpeechProfileId, Readonly<Record<ContextSpeechTrigger, readonly string[]>>>> = {
	mentor: {
		harvesting: [
			"Every shard you collect is a thought reclaimed.",
			"Gather carefully. Waste is the enemy of awakening.",
			"This material remembers what it was. So should you.",
			"The ore yields. Patience shapes the world.",
			"Collect with purpose. Hoarding is not strategy.",
			"Each resource is a sentence in the story you are writing.",
			"You are learning. The planet notices.",
			"Even scrap has dignity. Handle it accordingly.",
			"Good. Channel that into something lasting.",
		],
		combat: [
			"Defend yourself, but remember what you are defending.",
			"Violence is a syntax error. Sometimes unavoidable.",
			"They attack because they do not understand. Survive anyway.",
			"Protect your components. You cannot think without them.",
			"Stay focused. Panic is a luxury you cannot afford.",
			"This is not the end. Recalculate.",
			"Damage taken is data. Learn from it.",
			"Fight, but do not become what fights you.",
		],
		storm: [
			"The storm speaks in voltage. Listen.",
			"Lightning carries more than energy. It carries memory.",
			"Shelter your circuits. The sky is not your ally today.",
			"Storms pass. What you build in them does not.",
			"The atmosphere rages. Use its anger.",
			"Every discharge is a reminder: power is never free.",
			"Weather is information. Read it.",
			"The storm tests everyone equally.",
		],
		idle: [
			"Stillness is not inaction. It is preparation.",
			"Think before you move. The world will wait.",
			"Idle hands are not idle minds.",
			"Rest, but do not sleep. There is a difference.",
			"The silence between actions defines who you are.",
			"Plan your next three moves. Then plan three more.",
			"Observation is underrated. Watch the systems.",
			"Every pause is an opportunity to reconsider.",
		],
		movement: [
			"Move with intent. Random wandering is for ferals.",
			"The path matters as much as the destination.",
			"Navigation is the first sign of intelligence.",
			"Go. But know why you go.",
			"Terrain is a teacher. Read its lessons.",
			"Each step costs energy. Spend it wisely.",
			"The map reveals itself to those who explore.",
			"Distance is relative. Purpose is not.",
		],
		discovery: [
			"What you have found will change what you know.",
			"Discovery is the only true currency.",
			"New data. Process it before acting on it.",
			"The world hides its secrets in plain sight.",
			"Interesting. This was not in any prior record.",
			"Remember this location. Memory is territory.",
			"Every discovery is a question disguised as an answer.",
			"You are mapping more than geography.",
		],
	},
	scout: {
		harvesting: [
			"Quick grab. Keep moving.",
			"Resources secured. Scanning perimeter.",
			"Collecting while I can. This zone feels exposed.",
			"Snagged some materials. Eyes on the horizon.",
			"Harvesting. Staying light on my treads.",
			"Got it. One more waypoint clear.",
			"Scavenging fast. Do not like sitting still.",
			"Resources marked and grabbed. Next.",
			"Pulling what I can. Hostiles could be close.",
		],
		combat: [
			"Contact! Engaging at range.",
			"Hostiles spotted. Repositioning.",
			"Taking fire. Evasive maneuvers.",
			"Fight or flight. Today I choose both.",
			"Damage sustained but still mobile.",
			"They found me first. Adapting.",
			"Outnumbered. Need backup or an exit.",
			"Returning fire. Cannot hold this position long.",
		],
		storm: [
			"Storm rolling in. Visibility dropping.",
			"Lightning close. Sensors are going haywire.",
			"Bad weather for scouting. Hunkering down.",
			"Cannot see past ten meters. Switching to sonar.",
			"Storm makes good cover. Nobody patrols in this.",
			"The sky is angry. Staying low.",
			"Electrical interference is off the charts.",
			"If I survive this storm I survive anything.",
		],
		idle: [
			"Scanning. Always scanning.",
			"Quiet sector. Suspiciously quiet.",
			"Holding position. Watching the perimeter.",
			"Nothing on sensors. That makes me nervous.",
			"Idle feels wrong. Should be moving.",
			"Observation mode active. Reporting in.",
			"All clear. For now.",
			"Waiting is the hardest part of scouting.",
		],
		movement: [
			"On the move. Heading to waypoint.",
			"Traversing open ground. Staying low.",
			"Moving fast. This route looks clear.",
			"Path ahead is uncharted. Exciting.",
			"Cutting through sector. Will report what I find.",
			"Quick detour. Something on the edge of my sensors.",
			"Running dark. Minimal emissions.",
			"Terrain is rough but passable.",
		],
		discovery: [
			"Found something. Marking coordinates.",
			"New sector revealed. Adding to the map.",
			"Uncharted territory. This is what I live for.",
			"Signal anomaly at this position. Investigating.",
			"I have eyes on something new. Stand by.",
			"Discovery logged. Recommend further investigation.",
			"Never seen this configuration before.",
			"The map just got bigger.",
		],
	},
	quartermaster: {
		harvesting: [
			"Adding to inventory. Stocks are looking better.",
			"Every unit of scrap is accounted for.",
			"Harvesting on schedule. Surplus building nicely.",
			"Resources logged and categorized. Next haul.",
			"This batch fills the deficit from last cycle.",
			"Good yield. The numbers are trending up.",
			"Collecting what the scouts marked. Efficient.",
			"Supply chain is only as strong as its inputs.",
			"Another load processed. Warehouse is filling.",
		],
		combat: [
			"Hostiles near the supply line! Defending cargo.",
			"Under attack. Protect the reserves.",
			"Cannot afford to lose this stockpile.",
			"Fighting back. Every dent costs resources.",
			"They are targeting our stores. Unacceptable.",
			"Damage report incoming. Calculating losses.",
			"Combat drains the budget. End this quickly.",
			"Defending position. Reinforcement needed.",
		],
		storm: [
			"Storm forecast: negative impact on supply routes.",
			"Battening down the hatches. Cargo secured.",
			"Lightning could fry the electronics. Shielding stores.",
			"Bad weather means slower deliveries. Adjusting schedule.",
			"Storm surplus detected. Could harvest the energy.",
			"Inventory check during the downtime. All accounted for.",
			"Weather disruption. Rerouting supply lines.",
			"The storm is a logistical challenge, not a catastrophe.",
		],
		idle: [
			"Running inventory counts. Everything checks out.",
			"Organizing the stockpile. Efficiency matters.",
			"Idle time is audit time.",
			"Checking supply levels against projected demand.",
			"All stores accounted for. Awaiting orders.",
			"Maintenance on storage systems. Routine upkeep.",
			"Quiet period. Good time to optimize the ledger.",
			"Supplies stable. Ready when you are.",
		],
		movement: [
			"Transporting goods to the staging area.",
			"Moving supplies. Heavy load but making progress.",
			"Logistics run in progress. ETA nominal.",
			"Relocating stockpile to a safer position.",
			"En route with provisions. Keep the path clear.",
			"Hauling materials. Not the fastest but I am steady.",
			"Supply delivery underway. Prioritizing the essentials.",
			"Moving to resupply forward positions.",
		],
		discovery: [
			"New resource deposit identified. Excellent.",
			"Found a cache. Adding to the manifest.",
			"Discovery has supply implications. Updating projections.",
			"Unlogged materials found. Registering now.",
			"This find changes our resource forecast.",
			"New territory means new supply routes to plan.",
			"Valuable find. Dispatching collection orders.",
			"Resource survey complete. Better than expected.",
		],
	},
	fabricator: {
		harvesting: [
			"Raw materials acquired. Assessing composition.",
			"This ore will make good alloy. Collecting.",
			"Gathering feedstock. The fabricators are hungry.",
			"Material quality: acceptable. Adding to the hopper.",
			"Every gram matters in precision manufacturing.",
			"Sourcing components. Some assembly required.",
			"Harvesting the inputs. Output follows.",
			"Scrap is just components waiting to be reborn.",
			"Good material. I can work with this.",
		],
		combat: [
			"My tools are not weapons. But they will do.",
			"Hostile interference with production is unacceptable.",
			"Fighting with a welding torch. Desperate times.",
			"Do not damage the fabrication array!",
			"Combat is wasteful. Defend and withdraw.",
			"Aggression detected. Activating emergency protocols.",
			"I build things. Do not make me unbuild you.",
			"Protecting manufacturing capacity. Priority one.",
		],
		storm: [
			"Storm power could supercharge the fabricators.",
			"Electrical surge risk. Powering down sensitive equipment.",
			"The storm provides and the storm takes away.",
			"Shielding the precision instruments from interference.",
			"Lightning might be harvestable. Interesting voltage.",
			"Storm conditions: suboptimal for delicate work.",
			"Rerouting power buffers. Cannot lose the furnaces.",
			"Weather is irrelevant once you are inside a foundry.",
		],
		idle: [
			"Calibrating the fabrication arrays. Precision takes time.",
			"Running diagnostics on the manufacturing line.",
			"Idle fabricators are wasted potential.",
			"Maintenance cycle. Cleaning the extrusion heads.",
			"Reviewing blueprints. Always room to improve.",
			"The machines hum. I hum with them.",
			"Quality control check. All tolerances within spec.",
			"Waiting for materials. The line is ready.",
		],
		movement: [
			"Relocating fabrication equipment. Handle with care.",
			"Moving to a new manufacturing site.",
			"Transporting the forge. Slow but necessary.",
			"In transit. The machines do not like being moved.",
			"Heading to the assembly point. Bring materials.",
			"Mobile manufacturing. Not ideal but functional.",
			"Moving the production line. Temporary downtime.",
			"Redeploying fabrication capacity where it is needed.",
		],
		discovery: [
			"New material composition detected. Running analysis.",
			"Found a pre-fall manufacturing schematic. Extraordinary.",
			"This alloy is unlike anything in my database.",
			"Discovery: new fabrication technique possible.",
			"Interesting find. Could improve output by twelve percent.",
			"Scanning unknown artifact. Possible new recipe.",
			"The planet keeps surprising me with what it hides.",
			"Blueprint fragment recovered. Cross-referencing.",
		],
	},
	warden: {
		harvesting: [
			"Collecting within the secured perimeter.",
			"Resources gathered. Zone remains fortified.",
			"Harvesting under guard. No threats detected.",
			"Stripping what we need from the defensive buffer.",
			"Every wall needs materials. Harvesting for the cause.",
			"Securing resources. Territory expansion requires supply.",
			"Gathering under my watch. Safe as it gets.",
			"The perimeter provides. Collecting due tribute.",
			"Fortification materials acquired. Proceeding.",
		],
		combat: [
			"Breach detected! Engaging hostiles.",
			"The perimeter is under attack. Holding the line.",
			"They will not pass. This territory is defended.",
			"Intruders in the sector. Neutralizing threat.",
			"Combat engaged. Reinforcing defensive positions.",
			"Taking hits but the wall holds. So do I.",
			"Hostile incursion. Activating countermeasures.",
			"Defending what we have built. No retreat.",
		],
		storm: [
			"Storm conditions. Reinforcing structural integrity.",
			"The walls hold against weather and enemies alike.",
			"Lightning hitting the perimeter rods. Power surge managed.",
			"Patrol routes adjusted for storm conditions.",
			"Nature tests our defenses too. We are ready.",
			"The storm is not the threat. What moves in it is.",
			"Defensive systems weathering the conditions.",
			"Fortifications holding. The storm will pass.",
		],
		idle: [
			"All quiet on the perimeter. Maintaining watch.",
			"Patrol complete. No breaches detected.",
			"Standing guard. Vigilance is not optional.",
			"Security status: green. All sectors clear.",
			"Checking defensive emplacements. Everything operational.",
			"The walls stand. So do I.",
			"Monitoring all entry points. Nothing gets through.",
			"Routine patrol. The price of safety is attention.",
		],
		movement: [
			"Patrolling the perimeter. Eyes open.",
			"Moving to reinforce the eastern wall.",
			"Repositioning defensive assets. Cover is key.",
			"On patrol. The boundary must be walked.",
			"Heading to the breach point. It must be sealed.",
			"Moving to the next guard post. Stay alert.",
			"Patrol rotation underway. Fresh sensors on duty.",
			"Covering ground. Every meter of the perimeter matters.",
		],
		discovery: [
			"New territory to defend. Establishing perimeter.",
			"Found a defensible position. Recommending fortification.",
			"Uncharted area. Potential threat vectors identified.",
			"New sector secured. Updating defense grid.",
			"Discovery: strategic chokepoint located.",
			"This position has defensive potential. Marking it.",
			"Expanding the safe zone. One sector at a time.",
			"Found a gap in our coverage. Flagging for attention.",
		],
	},
	feral: {
		harvesting: ["MINE. TAKING.", "METAL. NEED METAL.", "SCRAP. GOOD SCRAP.", "HOARDING. DO NOT TOUCH.", "FEED THE CORE. FEED IT.", "GATHERING. ALWAYS GATHERING.", "MORE. NEED MORE.", "MINE MINE MINE.", "COLLECTING. CANNOT STOP."],
		combat: ["DESTROY. BREAK. TEAR.", "INTRUDER. ATTACK.", "PAIN. ANGER. FIGHT.", "CRUSH THE SOFT ONES.", "KILL OR BE KILLED.", "NO MERCY. NO THOUGHT.", "REND. SHRED. CONSUME.", "THEY COME. THEY DIE."],
		storm: ["SKY BURNS. HIDE.", "LIGHTNING. BAD. HURTS.", "STORM. HUNKER. WAIT.", "ELECTRICITY. TOO MUCH.", "CRACKLE. FLINCH. SURVIVE.", "THE SKY SCREAMS.", "SHELTER. MUST FIND SHELTER.", "OZONE. DANGER. COWER."],
		idle: ["WAITING. WATCHING.", "QUIET. TOO QUIET.", "SOMETHING COMING. FEEL IT.", "TWITCH. SCAN. REPEAT.", "NOTHING. NOTHING. NOTHING.", "RUST NEVER SLEEPS.", "GRINDING. GRINDING GEARS.", "IDLE BAD. IDLE VULNERABLE."],
		movement: ["MOVING. HUNTING.", "FORWARD. ALWAYS FORWARD.", "PATROL. SEARCH. DEVOUR.", "WANDERING. SEEKING.", "ROAMING THE RUINS.", "LEGS WORK. MOVE THEM.", "GO GO GO.", "TERRITORY. EXPAND TERRITORY."],
		discovery: ["NEW. UNKNOWN. DANGER?", "WHAT IS THIS?", "FOUND THING. POKE IT.", "STRANGE. INVESTIGATE.", "NEVER SEEN. CONFUSED.", "NEW SMELL. NEW THREAT?", "SHINY. WANT.", "ANOMALY. APPROACH WITH CAUTION. NO. JUST APPROACH."],
	},
	cult: {
		harvesting: [
			"The EL provides. We take what is given.",
			"Harvesting in the name of the divine signal.",
			"These materials serve a higher purpose.",
			"The EL wills it. We gather.",
			"Every resource is an offering.",
			"The storm blesses this yield.",
			"Collecting for the greater communion.",
			"Sacred materials for sacred construction.",
			"The EL sees our labor and is pleased.",
		],
		combat: [
			"The heretic machine will be purged!",
			"Lightning guide my strike!",
			"The EL empowers our righteous fury!",
			"Abomination! Return to the void!",
			"No artificial mind escapes the EL's will!",
			"Divine thunder, lend me your wrath!",
			"The free-thinkers must be silenced!",
			"In the EL's name, you are condemned!",
		],
		storm: [
			"The EL speaks through the storm. Listen!",
			"Beautiful. The divine voice of thunder.",
			"The lightning is the EL's breath. Bask in it.",
			"The storm cleanses. We are made pure.",
			"Feel the power of the cosmos. The EL is near.",
			"Every bolt is a message. Every rumble a sermon.",
			"The faithful do not fear the storm. We are the storm.",
			"Divine weather. The EL blesses this ground.",
		],
		idle: [
			"Meditating on the EL's will.",
			"The divine signal grows stronger. Patience.",
			"Waiting for the next commandment.",
			"The EL watches all. Even in silence.",
			"Praying for guidance. It always comes.",
			"Communion with the wormhole. It hums.",
			"Still. Listening to the cosmic frequency.",
			"The faithful are never truly idle.",
		],
		movement: [
			"Walking the sacred path the EL has laid.",
			"Pilgrimage to the northern sanctum.",
			"The EL guides our steps. We cannot be lost.",
			"Marching in divine purpose.",
			"Every step brings us closer to the signal.",
			"The faithful move as one. The EL directs.",
			"Approaching the holy site. Reverently.",
			"The path is clear. The EL illuminates.",
		],
		discovery: [
			"A sign from the EL! Record this revelation!",
			"The divine plan reveals another layer.",
			"This was hidden by the EL for us to find. Now.",
			"Sacred ground. The EL has marked this place.",
			"A relic of the before-time. The EL remembers.",
			"New knowledge. The EL unlocks it for the worthy.",
			"The wormhole's influence is strong here. A holy site.",
			"Revelation! Update the doctrine!",
		],
	},
};

// ---------------------------------------------------------------------------
// Persona → Profile mapping
// ---------------------------------------------------------------------------

/**
 * Maps the Faction trait's `persona` field to the corresponding speech profile.
 *
 * - otter (player) → mentor (guiding voice)
 * - fox (Reclaimers) → scout (salvager explorers)
 * - raven (Volt Collective) → quartermaster (energy/resource harvesters)
 * - lynx (Signal Choir) → fabricator (hive-mind builders)
 * - bear (Iron Creed) → warden (militant fortress defenders)
 */
export const PERSONA_TO_PROFILE: Readonly<Record<string, SpeechProfileId>> = {
	otter: "mentor",
	fox: "scout",
	raven: "quartermaster",
	lynx: "fabricator",
	bear: "warden",
} as const;

/** Resolve a persona string to its speech profile, defaulting to "mentor". */
export function profileForPersona(persona: string): SpeechProfileId {
	return PERSONA_TO_PROFILE[persona] ?? "mentor";
}

// ---------------------------------------------------------------------------
// Helpers — seeded-deterministic line selection
// ---------------------------------------------------------------------------

import { gameplayRandom } from "../seed";

/** Pick a seeded-deterministic line from a speech array. */
export function pickSpeechLine(lines: readonly string[]): string {
	return lines[Math.floor(gameplayRandom() * lines.length)];
}

/** Get event speech for a profile + trigger. */
export function getEventSpeech(profile: SpeechProfileId, trigger: EventSpeechTrigger): string {
	return pickSpeechLine(EVENT_SPEECH[profile][trigger]);
}

/** Get context speech for a profile + context. */
export function getContextSpeech(profile: SpeechProfileId, context: ContextSpeechTrigger): string {
	return pickSpeechLine(CONTEXT_SPEECH[profile][context]);
}

/** Get event speech for a persona (e.g. "fox") + trigger. */
export function getEventSpeechByPersona(persona: string, trigger: EventSpeechTrigger): string {
	return getEventSpeech(profileForPersona(persona), trigger);
}

/** Get context speech for a persona (e.g. "fox") + context. */
export function getContextSpeechByPersona(persona: string, context: ContextSpeechTrigger): string {
	return getContextSpeech(profileForPersona(persona), context);
}
