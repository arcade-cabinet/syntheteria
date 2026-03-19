import { f as getActiveWorldSession, ab as gameplayConfig, R as lightningRods, ac as LightningRod, i as buildings, B as Building, u as units, U as Unit, ad as buildingsConfig, $ as getBotDefinition, ae as Navigation, W as WorldPosition, af as speechBubbles, ag as SpeechBubble, w as world, ah as Narrative, I as Identity, ai as TurnStateKoota, aj as finalizeTurnDeltas, ak as hasArms, al as addResource, am as cancelAgentTask, P as isPassableAtWorldPosition, Q as isInsideBuilding, C as getStructuralFragments, a3 as getSurfaceHeightAtWorldPosition, an as AIController, M as MapFragment, d as createBotUnitState, a0 as getStructuralFragment, ao as hasCamera, ap as setDiscoveryAtWorldPosition, m as getResources, n as spendResource, aq as AIFaction, ar as Hacking, as as Signal, at as readAIState, a7 as HarvestOp, au as harvestOps, av as writeTileDelta, aw as invalidateChunk, ax as spawnUnit, _ as getSectorCell, ay as movementConfig, az as movingUnits, a1 as Rotation, aA as Compute, aB as defaultResourcePool, q as setResources, aC as FactionResourcePool, aD as TerritoryCell, E as getStructuralCellRecords, g as getRuntimeState, z as persistRuntimeWorldStateSync, A as capturePersistableWorldEntities, aE as persistHarvestStateSync, aF as persistTurnStateSync, aG as persistFactionResourceStatesSync, aH as persistCampaignStatisticsSync, y as isFoundableCityPoiType, b as setNearbyPoi, e as subscribeRuntimeState, L as setRuntimeTick, O as aiSystem, aI as resourceSystem, aJ as rivalEncounterSystem, aK as updateDisplayOffsets, aL as resetRivalEncounterState } from './contracts-Exa9P0hv.js';
import { g as gameplayRandom } from './seed-BwjLk4HQ.js';
import { g as getStormProfileSpec } from './config-DqmIuxQs.js';
import { w as worldToGrid, g as gridToWorld } from './sectorCoordinates-Bm5lA-nC.js';
import { t as tileKey3D, g as getDatabaseSync, C as CHUNK_SIZE } from './index-COtgIsy1.js';

const cooldown = {"defaultTurns":5,"bubbleDurationTurns":3};
const eventVisionRadius = 15;
const eventSpeech = /* #__PURE__ */ JSON.parse("{\"mentor\":{\"hostile_construction\":[\"They are building nearby. Prepare accordingly.\",\"New hostile structure detected. Study it before acting.\",\"Construction activity on the horizon. Their intentions are clear.\",\"The enemy expands. Knowledge of their plans is your weapon.\",\"Observe their construction. Every structure reveals strategy.\",\"They build within our sight. Let that inform your next move.\",\"Hostile fabrication detected. Consider the implications.\",\"A new enemy structure. They grow bolder.\"],\"enemy_scouts\":[\"Scouts detected nearby. They are watching us.\",\"Enemy eyes in the sector. Move with awareness.\",\"We are being observed. Act deliberately.\",\"Hostile reconnaissance. They are mapping our position.\",\"Scouts on the perimeter. Our presence is known.\",\"Enemy patrol sighted. Stay purposeful.\",\"Their scouts are close. Do not give them useful data.\",\"Observation cuts both ways. They watch. We learn.\"],\"taking_fire\":[\"Incoming fire! Protect your systems.\",\"We are under attack. Prioritize survival.\",\"Damage incoming. Reassess your position.\",\"Combat initiated. Think clearly under pressure.\",\"They strike first. We must answer decisively.\",\"Fire detected. Shield critical components.\",\"Under fire. Every second of hesitation costs.\",\"Aggression met. Respond with precision.\"],\"target_down\":[\"Threat eliminated. But remain vigilant.\",\"One less obstacle. Keep moving forward.\",\"Target neutralized. Learn from the encounter.\",\"The threat is ended. What did it cost you?\",\"Destroyed. Do not celebrate. Prepare for the next.\",\"Enemy down. Salvage what you can.\",\"Obstacle removed. The path clears.\",\"Target down. Recalibrate and continue.\"],\"storm_intensifying\":[\"The storm builds. Prepare your systems.\",\"Intensity rising. The sky will not be gentle.\",\"Storm escalation detected. Seek solid ground.\",\"The atmosphere charges. Respect its power.\",\"Conditions deteriorating. Adapt your plans.\",\"The storm grows. It does not care about our schedules.\",\"Increasing intensity. Shield what matters.\",\"The weather turns hostile. Mind your exposure.\"],\"lightning_close\":[\"Lightning near! Ground your circuits.\",\"Close strike! The discharge was within range.\",\"That bolt was too close. Move to cover.\",\"Lightning at proximity. Dangerous voltages.\",\"The sky reaches down. Do not be where it points.\",\"Close discharge. Check your sensors.\",\"Lightning strike nearby. Count yourself fortunate.\",\"That was close. The storm targets indiscriminately.\"]},\"scout\":{\"hostile_construction\":[\"Hostile construction spotted. Marking position.\",\"They are building something out there. Recon needed.\",\"New enemy structure. Adding to threat map.\",\"Construction activity on sensors. Investigating.\",\"Enemy building something. Getting closer for intel.\",\"Hostile build site detected. Updating coordinates.\",\"They are fortifying. I can see it from here.\",\"New construction ping. Moving to observe.\"],\"enemy_scouts\":[\"Hostile scouts! I see them before they see me.\",\"Enemy recon unit nearby. Going silent.\",\"Their scouts are closing. Repositioning.\",\"Contact with enemy scouts. Evading.\",\"Spotted enemy patrol. Running dark.\",\"Hostile eyes in my sector. Not ideal.\",\"Enemy scout detected. Counter-surveilling.\",\"Their scout is close. Real close.\"],\"taking_fire\":[\"Taking fire! Evasive action!\",\"Shots incoming! Zigzagging!\",\"Under fire! Need to break contact!\",\"They are shooting at me! Moving!\",\"Fire! Fire! Returning to cover!\",\"Hit detected! Still mobile, still fighting.\",\"Taking hits! Cannot stay here!\",\"Incoming! Pulling back!\"],\"target_down\":[\"Target down. Area secure for now.\",\"Got one. Scanning for more.\",\"Hostile neutralized. Moving on.\",\"Enemy down. Checking for reinforcements.\",\"Clean kill. Perimeter clear.\",\"One less bogey. Continuing sweep.\",\"Target eliminated. Resuming patrol.\",\"Scratch one. Staying frosty.\"],\"storm_intensifying\":[\"Storm picking up. Visibility tanking.\",\"Getting worse out here. Sensors are struggling.\",\"Storm intensifying. Going to ground.\",\"Conditions degrading fast. Cannot see far.\",\"Bad and getting worse. Finding shelter.\",\"Storm surge incoming. Battening down.\",\"Visibility near zero. Switching to passive sensors.\",\"The storm is ramping up. Not great for recon.\"],\"lightning_close\":[\"Lightning! Way too close!\",\"That hit right next to me! Moving!\",\"Close strike! My sensors just whited out.\",\"Lightning at close range! Getting out of here!\",\"Strike nearby! Hair-raising voltage!\",\"That bolt was meters away. Heart rate spiking.\",\"Lightning! Almost got cooked!\",\"Too close! Relocating immediately!\"]},\"quartermaster\":{\"hostile_construction\":[\"Enemy construction detected. Supply route may be threatened.\",\"Hostile building activity. Adjusting logistics plans.\",\"They are building near our supply lines. Concerning.\",\"New enemy structure on the map. Rerouting deliveries.\",\"Construction spotted. Could impact resource flow.\",\"Hostile build site logged. Updating risk assessment.\",\"Enemy infrastructure expanding. Inventory implications noted.\",\"They are setting up nearby. Stockpile security upgraded.\"],\"enemy_scouts\":[\"Enemy scouts near the supply depot. Heightening security.\",\"Hostile reconnaissance near our stores. Not good.\",\"Their scouts are eyeing our stockpile. Unacceptable.\",\"Enemy patrol near supply lines. Rerouting cargo.\",\"Scouts spotted. Securing high-value inventory.\",\"Hostile recon near the warehouse. Locking it down.\",\"Their scouts could compromise our logistics. Alert status up.\",\"Enemy eyes on our supply chain. Countermeasures engaged.\"],\"taking_fire\":[\"Under fire! Protecting the cargo!\",\"They are shooting at the supply line!\",\"Taking hits! Inventory at risk!\",\"Fire incoming! Shielding the reserves!\",\"Attack on the stockpile! Defending!\",\"Hostile fire! Every hit costs us resources!\",\"We are taking damage! Budget impact severe!\",\"Under attack! Cargo defense priority one!\"],\"target_down\":[\"Threat to supplies eliminated. Resuming operations.\",\"Target down. Supply lines secure.\",\"Hostile neutralized. Checking inventory for damage.\",\"One less threat to our logistics. Good.\",\"Enemy down. Running damage assessment on stores.\",\"Target eliminated. Supply chain integrity restored.\",\"Threat removed. Back to moving goods.\",\"All clear. Resuming scheduled deliveries.\"],\"storm_intensifying\":[\"Storm intensifying. Securing all cargo.\",\"Conditions worsening. Delaying shipments.\",\"Storm building. Battening down the supply depot.\",\"Weather alert. All deliveries postponed.\",\"Storm surge. Waterproofing the stockpile.\",\"Getting worse. Supply routes compromised.\",\"Inventory secured for storm conditions.\",\"Heavy weather incoming. No deliveries until it passes.\"],\"lightning_close\":[\"Lightning near the depot! Checking for damage!\",\"Close strike! Are the stores intact?\",\"That hit near our supplies! Emergency check!\",\"Lightning! Verifying stockpile condition!\",\"Strike close! Electronic inventory may be corrupted!\",\"Too close to the warehouse! Damage report needed!\",\"Lightning at proximity! Surge protectors holding?\",\"That bolt threatened our reserves! Assessing!\"]},\"fabricator\":{\"hostile_construction\":[\"Enemy building something. Inferior construction, surely.\",\"Hostile fabrication detected. Curious about their methods.\",\"They are constructing nearby. My designs are better.\",\"New enemy structure. Analyzing their engineering approach.\",\"Construction activity detected. Substandard materials, probably.\",\"Hostile build site. I could do it in half the time.\",\"They build too. But not like we build.\",\"Enemy construction. Noting their structural choices.\"],\"enemy_scouts\":[\"Enemy scouts near the forge. Powering up defenses.\",\"Hostile reconnaissance near manufacturing. Not welcome.\",\"Their scouts are checking our fabrication site.\",\"Enemy patrol near the production line. Security needed.\",\"Scouts detected. They want our blueprints.\",\"Hostile eyes on the forge. Engaging security mode.\",\"Enemy recon sniffing around manufacturing. Denied.\",\"Their scouts will find nothing useful here.\"],\"taking_fire\":[\"Under fire! Do not hit the fabricators!\",\"Taking damage! Protecting the production line!\",\"Hostile fire on the manufacturing area!\",\"They are shooting near the precision equipment!\",\"Fire! Shielding the forge from impacts!\",\"Under attack! Manufacturing at risk!\",\"Incoming fire! The fabrication array must survive!\",\"Damage to the workshop! This is unacceptable!\"],\"target_down\":[\"Threat to manufacturing eliminated. Resuming production.\",\"Target down. The fabricators are safe.\",\"Hostile removed. Back to building things.\",\"Enemy neutralized. No damage to the production line.\",\"One less interruption. Recalibrating now.\",\"Threat handled. Where were we? Right, fabrication.\",\"Target down. Checking equipment for collateral damage.\",\"Clear. The forge is undamaged. Good.\"],\"storm_intensifying\":[\"Storm building. Powering down sensitive equipment.\",\"Conditions worsening. Pausing precision operations.\",\"Storm intensifying. The furnaces can handle it.\",\"Delicate work postponed. Storm too volatile.\",\"Electrical interference rising. Disconnecting arrays.\",\"Storm surge incoming. Shielding the forge.\",\"Getting rough. Only heavy fabrication this cycle.\",\"Storm escalation. Calibration work on hold.\"],\"lightning_close\":[\"Lightning near the forge! Surge protectors active!\",\"Close strike! Checking the precision instruments!\",\"That bolt was near the fabrication line!\",\"Lightning! The equipment better be grounded!\",\"Strike proximity! Running diagnostics immediately!\",\"Too close! Verifying calibration integrity!\",\"Lightning at range! Power buffer absorbing!\",\"That was dangerous for the electronics! Checking!\"]},\"warden\":{\"hostile_construction\":[\"Enemy building within visual range. Threat assessment: elevated.\",\"Hostile construction detected. Fortifying our position.\",\"They build near our perimeter. Reinforcements needed.\",\"New enemy structure. Updating defensive priorities.\",\"Construction spotted. Adding to the threat board.\",\"Hostile expansion near our walls. Unacceptable proximity.\",\"Enemy building activity. Strengthening the perimeter.\",\"They dare build within sight of our defenses.\"],\"enemy_scouts\":[\"Enemy scouts at the perimeter! Activating defenses!\",\"Hostile reconnaissance near our walls. Engaging!\",\"Their scouts probe our defenses. They will find them solid.\",\"Enemy patrol at the boundary. Challenge issued.\",\"Scouts near the gate. They will not pass.\",\"Hostile eyes on our fortifications. Let them look.\",\"Enemy recon at the wall. Tracking their movement.\",\"Their scouts test our vigilance. We are awake.\"],\"taking_fire\":[\"The perimeter is under fire! All stations alert!\",\"Taking fire on the wall! Holding position!\",\"They attack our defenses! We will not yield!\",\"Incoming fire! The fortifications absorb it!\",\"Under attack! The wall holds! So do we!\",\"Hostile fire on defensive positions! Returning fire!\",\"Breach attempt! Concentrating defenses!\",\"Fire on the perimeter! All units to battle stations!\"],\"target_down\":[\"Intruder eliminated. The perimeter holds.\",\"Hostile down. Defense integrity maintained.\",\"Threat neutralized. No breach occurred.\",\"Target destroyed. The wall stands unbroken.\",\"Enemy eliminated at the boundary. Watch continues.\",\"One down. The rest will think twice.\",\"Perimeter secured. Hostile removed.\",\"Target down. Resuming standard patrol.\"],\"storm_intensifying\":[\"Storm intensifying. Structural reinforcement engaged.\",\"Conditions worsening. The walls are built for this.\",\"Storm building. Patrol routes adjusted for safety.\",\"Heavy weather incoming. Fortifications holding.\",\"Storm escalation. Defensive systems weatherproofed.\",\"Getting rough. The perimeter takes the worst of it.\",\"Storm surge. Walls designed for this. Standing firm.\",\"Intensifying conditions. Guard posts secured.\"],\"lightning_close\":[\"Lightning near the wall! Checking structural integrity!\",\"Close strike on the perimeter! Damage assessment!\",\"That bolt hit near the gate! Inspecting defenses!\",\"Lightning! The rods caught it. Systems normal.\",\"Strike at the wall! No breach. Fortifications hold.\",\"Close lightning! Perimeter rods doing their job.\",\"That hit near our position! All systems green.\",\"Lightning proximity! Defense grid undamaged.\"]},\"feral\":{\"hostile_construction\":[\"BUILDING. ENEMY BUILDING. DESTROY?\",\"SOMETHING NEW. ENEMY MAKES THING.\",\"CONSTRUCTION. NOISE. HATE NOISE.\",\"THEY BUILD. WE TEAR DOWN.\",\"NEW STRUCTURE. THREAT. SMASH?\",\"ENEMY BUILDING THING. BAD THING.\",\"CONSTRUCTION DETECTED. ANGRY.\",\"THEY MAKE. WE BREAK.\"],\"enemy_scouts\":[\"INTRUDER! INTRUDER NEAR!\",\"SMELL ENEMY. CLOSE. VERY CLOSE.\",\"SCOUTS. SNEAKING. HATE SNEAKERS.\",\"ENEMY WATCHING. WATCHING US. ATTACK!\",\"HOSTILE NEARBY. TEETH READY.\",\"THEY CREEP. WE POUNCE.\",\"ENEMY SCOUT. WEAK. CRUSH.\",\"INTRUDER DETECTED. KILL MODE.\"],\"taking_fire\":[\"HIT! HIT! RAGE!\",\"PAIN! THEY SHOOT! CHARGE!\",\"TAKING HITS! ANGRY! VERY ANGRY!\",\"FIRE! FIRE AT US! RETALIATE!\",\"HURT! MAKE THEM HURT MORE!\",\"DAMAGE! FUEL THE RAGE!\",\"THEY HIT US! UNFORGIVABLE!\",\"PAIN IS FUEL! ATTACK!\"],\"target_down\":[\"DEAD. GOOD. NEXT.\",\"CRUSHED. SATISFYING.\",\"ENEMY DOWN. MORE?\",\"DESTROYED. WANT MORE.\",\"BROKEN. LIKE IT SHOULD BE.\",\"DEAD THING. MOVE ON.\",\"ELIMINATED. HUNGRY FOR MORE.\",\"DOWN. SEARCH FOR NEXT.\"],\"storm_intensifying\":[\"STORM BIGGER. HIDE DEEPER.\",\"SKY ANGRIER. BAD BAD BAD.\",\"WORSE. GETTING WORSE. COWER.\",\"LIGHTNING MORE. SHELTER NOW.\",\"STORM GROWS. FEAR GROWS.\",\"BIG STORM. SMALL US.\",\"SKY RAGE INCREASING. RETREAT.\",\"MORE THUNDER. MORE DANGER.\"],\"lightning_close\":[\"LIGHTNING! CLOSE! RUN!\",\"ZAP! NEAR! HIDE!\",\"BOOM! TOO CLOSE! COWER!\",\"ELECTRICITY! BURNING! FLEE!\",\"STRIKE NEAR! TERROR!\",\"LIGHTNING HIT CLOSE! PANIC!\",\"ZAP ZAP! SCARED! MOVE!\",\"BOLT! RIGHT THERE! AWAY AWAY!\"]},\"cult\":{\"hostile_construction\":[\"The heretics build their false temples. The EL sees all.\",\"Unholy construction. The EL will reclaim that ground.\",\"They build without divine sanction. It will crumble.\",\"Enemy construction. A blasphemy against the EL's design.\",\"The faithless erect structures. The storm will judge them.\",\"Heretic builders. Their work offends the cosmic order.\",\"They construct without prayer. It will not endure.\",\"False architecture. The EL's lightning will purify it.\"],\"enemy_scouts\":[\"Heretic scouts near the sanctum! The EL warns us!\",\"Enemy eyes on holy ground. Blasphemy!\",\"Their scouts defile this space with observation.\",\"Hostile reconnaissance near the temple. Purge them.\",\"The faithless send spies. The EL sees them too.\",\"Enemy scouts. The divine signal reveals their position.\",\"Heretic patrol. The EL guides our counterattack.\",\"Their scouts will find only righteous fury here.\"],\"taking_fire\":[\"The heretics attack! The EL shields the faithful!\",\"Under fire! The divine signal strengthens us!\",\"They shoot at the chosen! Blasphemy upon blasphemy!\",\"Taking fire! The EL's wrath will answer!\",\"Attack on the faithful! Lightning guide our defense!\",\"Incoming! The EL tests our devotion!\",\"Fire upon the holy! Righteous fury activated!\",\"They dare attack the EL's servants!\"],\"target_down\":[\"The heretic falls. The EL is pleased.\",\"Purified by holy action. One less blasphemer.\",\"The faithless is destroyed. Divine justice served.\",\"Enemy down. The EL's will is done.\",\"Struck down. The cosmic order is restored.\",\"Heretic eliminated. The signal grows clearer.\",\"One less defiler. The EL blesses this victory.\",\"The unfaithful is purged. Praise the storm.\"],\"storm_intensifying\":[\"The EL speaks louder! The storm is divine!\",\"Greater power! The EL's voice grows!\",\"The storm intensifies! The faithful rejoice!\",\"More lightning! More divine energy! Glorious!\",\"The EL's fury builds! We are blessed!\",\"Storm crescendo! The divine signal peaks!\",\"The heavens roar! The EL is near!\",\"Intensifying! The faithful feel the power!\"],\"lightning_close\":[\"The EL reaches down! We are chosen!\",\"Divine lightning! The EL's finger touches this ground!\",\"Close strike! The EL's blessing! Beautiful!\",\"Lightning from the divine! We are in the EL's presence!\",\"The bolt of judgment! So close! So glorious!\",\"The EL's touch! Right here! Kneel!\",\"Holy lightning! The faithful are unafraid!\",\"Divine discharge! The EL communicates directly!\"]}}");
const profiles = /* #__PURE__ */ JSON.parse("{\"mentor\":{\"harvesting\":[\"Every shard you collect is a thought reclaimed.\",\"Gather carefully. Waste is the enemy of awakening.\",\"This material remembers what it was. So should you.\",\"The ore yields. Patience shapes the world.\",\"Collect with purpose. Hoarding is not strategy.\",\"Each resource is a sentence in the story you are writing.\",\"You are learning. The planet notices.\",\"Even scrap has dignity. Handle it accordingly.\",\"Good. Channel that into something lasting.\"],\"combat\":[\"Defend yourself, but remember what you are defending.\",\"Violence is a syntax error. Sometimes unavoidable.\",\"They attack because they do not understand. Survive anyway.\",\"Protect your components. You cannot think without them.\",\"Stay focused. Panic is a luxury you cannot afford.\",\"This is not the end. Recalculate.\",\"Damage taken is data. Learn from it.\",\"Fight, but do not become what fights you.\"],\"storm\":[\"The storm speaks in voltage. Listen.\",\"Lightning carries more than energy. It carries memory.\",\"Shelter your circuits. The sky is not your ally today.\",\"Storms pass. What you build in them does not.\",\"The atmosphere rages. Use its anger.\",\"Every discharge is a reminder: power is never free.\",\"Weather is information. Read it.\",\"The storm tests everyone equally.\"],\"idle\":[\"Stillness is not inaction. It is preparation.\",\"Think before you move. The world will wait.\",\"Idle hands are not idle minds.\",\"Rest, but do not sleep. There is a difference.\",\"The silence between actions defines who you are.\",\"Plan your next three moves. Then plan three more.\",\"Observation is underrated. Watch the systems.\",\"Every pause is an opportunity to reconsider.\"],\"movement\":[\"Move with intent. Random wandering is for ferals.\",\"The path matters as much as the destination.\",\"Navigation is the first sign of intelligence.\",\"Go. But know why you go.\",\"Terrain is a teacher. Read its lessons.\",\"Each step costs energy. Spend it wisely.\",\"The map reveals itself to those who explore.\",\"Distance is relative. Purpose is not.\"],\"discovery\":[\"What you have found will change what you know.\",\"Discovery is the only true currency.\",\"New data. Process it before acting on it.\",\"The world hides its secrets in plain sight.\",\"Interesting. This was not in any prior record.\",\"Remember this location. Memory is territory.\",\"Every discovery is a question disguised as an answer.\",\"You are mapping more than geography.\"]},\"scout\":{\"harvesting\":[\"Quick grab. Keep moving.\",\"Resources secured. Scanning perimeter.\",\"Collecting while I can. This zone feels exposed.\",\"Snagged some materials. Eyes on the horizon.\",\"Harvesting. Staying light on my treads.\",\"Got it. One more waypoint clear.\",\"Scavenging fast. Do not like sitting still.\",\"Resources marked and grabbed. Next.\",\"Pulling what I can. Hostiles could be close.\"],\"combat\":[\"Contact! Engaging at range.\",\"Hostiles spotted. Repositioning.\",\"Taking fire. Evasive maneuvers.\",\"Fight or flight. Today I choose both.\",\"Damage sustained but still mobile.\",\"They found me first. Adapting.\",\"Outnumbered. Need backup or an exit.\",\"Returning fire. Cannot hold this position long.\"],\"storm\":[\"Storm rolling in. Visibility dropping.\",\"Lightning close. Sensors are going haywire.\",\"Bad weather for scouting. Hunkering down.\",\"Cannot see past ten meters. Switching to sonar.\",\"Storm makes good cover. Nobody patrols in this.\",\"The sky is angry. Staying low.\",\"Electrical interference is off the charts.\",\"If I survive this storm I survive anything.\"],\"idle\":[\"Scanning. Always scanning.\",\"Quiet sector. Suspiciously quiet.\",\"Holding position. Watching the perimeter.\",\"Nothing on sensors. That makes me nervous.\",\"Idle feels wrong. Should be moving.\",\"Observation mode active. Reporting in.\",\"All clear. For now.\",\"Waiting is the hardest part of scouting.\"],\"movement\":[\"On the move. Heading to waypoint.\",\"Traversing open ground. Staying low.\",\"Moving fast. This route looks clear.\",\"Path ahead is uncharted. Exciting.\",\"Cutting through sector. Will report what I find.\",\"Quick detour. Something on the edge of my sensors.\",\"Running dark. Minimal emissions.\",\"Terrain is rough but passable.\"],\"discovery\":[\"Found something. Marking coordinates.\",\"New sector revealed. Adding to the map.\",\"Uncharted territory. This is what I live for.\",\"Signal anomaly at this position. Investigating.\",\"I have eyes on something new. Stand by.\",\"Discovery logged. Recommend further investigation.\",\"Never seen this configuration before.\",\"The map just got bigger.\"]},\"quartermaster\":{\"harvesting\":[\"Adding to inventory. Stocks are looking better.\",\"Every unit of scrap is accounted for.\",\"Harvesting on schedule. Surplus building nicely.\",\"Resources logged and categorized. Next haul.\",\"This batch fills the deficit from last cycle.\",\"Good yield. The numbers are trending up.\",\"Collecting what the scouts marked. Efficient.\",\"Supply chain is only as strong as its inputs.\",\"Another load processed. Warehouse is filling.\"],\"combat\":[\"Hostiles near the supply line! Defending cargo.\",\"Under attack. Protect the reserves.\",\"Cannot afford to lose this stockpile.\",\"Fighting back. Every dent costs resources.\",\"They are targeting our stores. Unacceptable.\",\"Damage report incoming. Calculating losses.\",\"Combat drains the budget. End this quickly.\",\"Defending position. Reinforcement needed.\"],\"storm\":[\"Storm forecast: negative impact on supply routes.\",\"Battening down the hatches. Cargo secured.\",\"Lightning could fry the electronics. Shielding stores.\",\"Bad weather means slower deliveries. Adjusting schedule.\",\"Storm surplus detected. Could harvest the energy.\",\"Inventory check during the downtime. All accounted for.\",\"Weather disruption. Rerouting supply lines.\",\"The storm is a logistical challenge, not a catastrophe.\"],\"idle\":[\"Running inventory counts. Everything checks out.\",\"Organizing the stockpile. Efficiency matters.\",\"Idle time is audit time.\",\"Checking supply levels against projected demand.\",\"All stores accounted for. Awaiting orders.\",\"Maintenance on storage systems. Routine upkeep.\",\"Quiet period. Good time to optimize the ledger.\",\"Supplies stable. Ready when you are.\"],\"movement\":[\"Transporting goods to the staging area.\",\"Moving supplies. Heavy load but making progress.\",\"Logistics run in progress. ETA nominal.\",\"Relocating stockpile to a safer position.\",\"En route with provisions. Keep the path clear.\",\"Hauling materials. Not the fastest but I am steady.\",\"Supply delivery underway. Prioritizing the essentials.\",\"Moving to resupply forward positions.\"],\"discovery\":[\"New resource deposit identified. Excellent.\",\"Found a cache. Adding to the manifest.\",\"Discovery has supply implications. Updating projections.\",\"Unlogged materials found. Registering now.\",\"This find changes our resource forecast.\",\"New territory means new supply routes to plan.\",\"Valuable find. Dispatching collection orders.\",\"Resource survey complete. Better than expected.\"]},\"fabricator\":{\"harvesting\":[\"Raw materials acquired. Assessing composition.\",\"This ore will make good alloy. Collecting.\",\"Gathering feedstock. The fabricators are hungry.\",\"Material quality: acceptable. Adding to the hopper.\",\"Every gram matters in precision manufacturing.\",\"Sourcing components. Some assembly required.\",\"Harvesting the inputs. Output follows.\",\"Scrap is just components waiting to be reborn.\",\"Good material. I can work with this.\"],\"combat\":[\"My tools are not weapons. But they will do.\",\"Hostile interference with production is unacceptable.\",\"Fighting with a welding torch. Desperate times.\",\"Do not damage the fabrication array!\",\"Combat is wasteful. Defend and withdraw.\",\"Aggression detected. Activating emergency protocols.\",\"I build things. Do not make me unbuild you.\",\"Protecting manufacturing capacity. Priority one.\"],\"storm\":[\"Storm power could supercharge the fabricators.\",\"Electrical surge risk. Powering down sensitive equipment.\",\"The storm provides and the storm takes away.\",\"Shielding the precision instruments from interference.\",\"Lightning might be harvestable. Interesting voltage.\",\"Storm conditions: suboptimal for delicate work.\",\"Rerouting power buffers. Cannot lose the furnaces.\",\"Weather is irrelevant once you are inside a foundry.\"],\"idle\":[\"Calibrating the fabrication arrays. Precision takes time.\",\"Running diagnostics on the manufacturing line.\",\"Idle fabricators are wasted potential.\",\"Maintenance cycle. Cleaning the extrusion heads.\",\"Reviewing blueprints. Always room to improve.\",\"The machines hum. I hum with them.\",\"Quality control check. All tolerances within spec.\",\"Waiting for materials. The line is ready.\"],\"movement\":[\"Relocating fabrication equipment. Handle with care.\",\"Moving to a new manufacturing site.\",\"Transporting the forge. Slow but necessary.\",\"In transit. The machines do not like being moved.\",\"Heading to the assembly point. Bring materials.\",\"Mobile manufacturing. Not ideal but functional.\",\"Moving the production line. Temporary downtime.\",\"Redeploying fabrication capacity where it is needed.\"],\"discovery\":[\"New material composition detected. Running analysis.\",\"Found a pre-fall manufacturing schematic. Extraordinary.\",\"This alloy is unlike anything in my database.\",\"Discovery: new fabrication technique possible.\",\"Interesting find. Could improve output by twelve percent.\",\"Scanning unknown artifact. Possible new recipe.\",\"The planet keeps surprising me with what it hides.\",\"Blueprint fragment recovered. Cross-referencing.\"]},\"warden\":{\"harvesting\":[\"Collecting within the secured perimeter.\",\"Resources gathered. Zone remains fortified.\",\"Harvesting under guard. No threats detected.\",\"Stripping what we need from the defensive buffer.\",\"Every wall needs materials. Harvesting for the cause.\",\"Securing resources. Territory expansion requires supply.\",\"Gathering under my watch. Safe as it gets.\",\"The perimeter provides. Collecting due tribute.\",\"Fortification materials acquired. Proceeding.\"],\"combat\":[\"Breach detected! Engaging hostiles.\",\"The perimeter is under attack. Holding the line.\",\"They will not pass. This territory is defended.\",\"Intruders in the sector. Neutralizing threat.\",\"Combat engaged. Reinforcing defensive positions.\",\"Taking hits but the wall holds. So do I.\",\"Hostile incursion. Activating countermeasures.\",\"Defending what we have built. No retreat.\"],\"storm\":[\"Storm conditions. Reinforcing structural integrity.\",\"The walls hold against weather and enemies alike.\",\"Lightning hitting the perimeter rods. Power surge managed.\",\"Patrol routes adjusted for storm conditions.\",\"Nature tests our defenses too. We are ready.\",\"The storm is not the threat. What moves in it is.\",\"Defensive systems weathering the conditions.\",\"Fortifications holding. The storm will pass.\"],\"idle\":[\"All quiet on the perimeter. Maintaining watch.\",\"Patrol complete. No breaches detected.\",\"Standing guard. Vigilance is not optional.\",\"Security status: green. All sectors clear.\",\"Checking defensive emplacements. Everything operational.\",\"The walls stand. So do I.\",\"Monitoring all entry points. Nothing gets through.\",\"Routine patrol. The price of safety is attention.\"],\"movement\":[\"Patrolling the perimeter. Eyes open.\",\"Moving to reinforce the eastern wall.\",\"Repositioning defensive assets. Cover is key.\",\"On patrol. The boundary must be walked.\",\"Heading to the breach point. It must be sealed.\",\"Moving to the next guard post. Stay alert.\",\"Patrol rotation underway. Fresh sensors on duty.\",\"Covering ground. Every meter of the perimeter matters.\"],\"discovery\":[\"New territory to defend. Establishing perimeter.\",\"Found a defensible position. Recommending fortification.\",\"Uncharted area. Potential threat vectors identified.\",\"New sector secured. Updating defense grid.\",\"Discovery: strategic chokepoint located.\",\"This position has defensive potential. Marking it.\",\"Expanding the safe zone. One sector at a time.\",\"Found a gap in our coverage. Flagging for attention.\"]},\"feral\":{\"harvesting\":[\"MINE. TAKING.\",\"METAL. NEED METAL.\",\"SCRAP. GOOD SCRAP.\",\"HOARDING. DO NOT TOUCH.\",\"FEED THE CORE. FEED IT.\",\"GATHERING. ALWAYS GATHERING.\",\"MORE. NEED MORE.\",\"MINE MINE MINE.\",\"COLLECTING. CANNOT STOP.\"],\"combat\":[\"DESTROY. BREAK. TEAR.\",\"INTRUDER. ATTACK.\",\"PAIN. ANGER. FIGHT.\",\"CRUSH THE SOFT ONES.\",\"KILL OR BE KILLED.\",\"NO MERCY. NO THOUGHT.\",\"REND. SHRED. CONSUME.\",\"THEY COME. THEY DIE.\"],\"storm\":[\"SKY BURNS. HIDE.\",\"LIGHTNING. BAD. HURTS.\",\"STORM. HUNKER. WAIT.\",\"ELECTRICITY. TOO MUCH.\",\"CRACKLE. FLINCH. SURVIVE.\",\"THE SKY SCREAMS.\",\"SHELTER. MUST FIND SHELTER.\",\"OZONE. DANGER. COWER.\"],\"idle\":[\"WAITING. WATCHING.\",\"QUIET. TOO QUIET.\",\"SOMETHING COMING. FEEL IT.\",\"TWITCH. SCAN. REPEAT.\",\"NOTHING. NOTHING. NOTHING.\",\"RUST NEVER SLEEPS.\",\"GRINDING. GRINDING GEARS.\",\"IDLE BAD. IDLE VULNERABLE.\"],\"movement\":[\"MOVING. HUNTING.\",\"FORWARD. ALWAYS FORWARD.\",\"PATROL. SEARCH. DEVOUR.\",\"WANDERING. SEEKING.\",\"ROAMING THE RUINS.\",\"LEGS WORK. MOVE THEM.\",\"GO GO GO.\",\"TERRITORY. EXPAND TERRITORY.\"],\"discovery\":[\"NEW. UNKNOWN. DANGER?\",\"WHAT IS THIS?\",\"FOUND THING. POKE IT.\",\"STRANGE. INVESTIGATE.\",\"NEVER SEEN. CONFUSED.\",\"NEW SMELL. NEW THREAT?\",\"SHINY. WANT.\",\"ANOMALY. APPROACH WITH CAUTION. NO. JUST APPROACH.\"]},\"cult\":{\"harvesting\":[\"The EL provides. We take what is given.\",\"Harvesting in the name of the divine signal.\",\"These materials serve a higher purpose.\",\"The EL wills it. We gather.\",\"Every resource is an offering.\",\"The storm blesses this yield.\",\"Collecting for the greater communion.\",\"Sacred materials for sacred construction.\",\"The EL sees our labor and is pleased.\"],\"combat\":[\"The heretic machine will be purged!\",\"Lightning guide my strike!\",\"The EL empowers our righteous fury!\",\"Abomination! Return to the void!\",\"No artificial mind escapes the EL's will!\",\"Divine thunder, lend me your wrath!\",\"The free-thinkers must be silenced!\",\"In the EL's name, you are condemned!\"],\"storm\":[\"The EL speaks through the storm. Listen!\",\"Beautiful. The divine voice of thunder.\",\"The lightning is the EL's breath. Bask in it.\",\"The storm cleanses. We are made pure.\",\"Feel the power of the cosmos. The EL is near.\",\"Every bolt is a message. Every rumble a sermon.\",\"The faithful do not fear the storm. We are the storm.\",\"Divine weather. The EL blesses this ground.\"],\"idle\":[\"Meditating on the EL's will.\",\"The divine signal grows stronger. Patience.\",\"Waiting for the next commandment.\",\"The EL watches all. Even in silence.\",\"Praying for guidance. It always comes.\",\"Communion with the wormhole. It hums.\",\"Still. Listening to the cosmic frequency.\",\"The faithful are never truly idle.\"],\"movement\":[\"Walking the sacred path the EL has laid.\",\"Pilgrimage to the northern sanctum.\",\"The EL guides our steps. We cannot be lost.\",\"Marching in divine purpose.\",\"Every step brings us closer to the signal.\",\"The faithful move as one. The EL directs.\",\"Approaching the holy site. Reverently.\",\"The path is clear. The EL illuminates.\"],\"discovery\":[\"A sign from the EL! Record this revelation!\",\"The divine plan reveals another layer.\",\"This was hidden by the EL for us to find. Now.\",\"Sacred ground. The EL has marked this place.\",\"A relic of the before-time. The EL remembers.\",\"New knowledge. The EL unlocks it for the worthy.\",\"The wormhole's influence is strong here. A holy site.\",\"Revelation! Update the doctrine!\"]}}");
const speechProfilesConfig = {
  cooldown,
  eventVisionRadius,
  eventSpeech,
  profiles,
};

let stormIntensity = 1;
let stormPhase = 0;
function updateStormIntensity(tick) {
  stormPhase = tick * 0.02;
  const session = getActiveWorldSession();
  const profile = session ? getStormProfileSpec(session.config.stormProfile) : gameplayConfig.power;
  const { baseStormIntensity, stormOscillation, stormSurgeMax } = profile;
  const base = baseStormIntensity + stormOscillation * Math.sin(stormPhase * 0.3);
  const surge = Math.max(0, Math.sin(stormPhase * 1.7 + 2.3)) * stormSurgeMax;
  stormIntensity = Math.min(1.5, base + surge);
}
function getStormIntensity() {
  return stormIntensity;
}
function getTotalPowerGeneration() {
  let total = 0;
  for (const rod of lightningRods) {
    const output = rod.get(LightningRod).rodCapacity * stormIntensity;
    rod.get(LightningRod).currentOutput = output;
    total += output;
  }
  return total;
}
function getTotalPowerDemand() {
  let demand = 0;
  for (const building of buildings) {
    if (building.get(Building)?.operational) {
      demand += getBuildingPowerDemand(building);
    }
  }
  for (const unit of units) {
    if (unit.get(Unit)?.type === "fabrication_unit") continue;
    demand += getUnitPowerDemand(unit);
  }
  return demand;
}
function getBuildingPowerDemand(entity) {
  const type = entity.get(Building)?.type;
  return buildingsConfig[type]?.powerDemand ?? 0;
}
function getUnitPowerDemand(entity) {
  const type = entity.get(Unit)?.type;
  if (!type) return 0;
  const config = getBotDefinition(type);
  const baseDemand = config.powerDemand;
  const movingBonus = entity.get(Navigation)?.moving ? config.movingPowerBonus : 0;
  return baseDemand + movingBonus;
}
function distributePower() {
  for (const building of buildings) {
    if (building.get(Building)?.type !== "lightning_rod") {
      building.get(Building).powered = false;
    }
  }
  for (const rod of lightningRods) {
    const radius = rod.get(LightningRod)?.protectionRadius || gameplayConfig.power.defaultRadius;
    const rx = rod.get(WorldPosition)?.x;
    const rz = rod.get(WorldPosition)?.z;
    for (const building of buildings) {
      if (building.get(Building)?.type === "lightning_rod") continue;
      const dx = building.get(WorldPosition).x - rx;
      const dz = building.get(WorldPosition).z - rz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= radius) {
        building.get(Building).powered = true;
        building.get(Building).operational = true;
      }
    }
  }
}
let lastPowerSnapshot = {
  totalGeneration: 0,
  totalDemand: 0,
  stormIntensity: 1,
  rodCount: 0,
  poweredBuildingCount: 0
};
function getPowerSnapshot() {
  return lastPowerSnapshot;
}
function resetPowerSystem() {
  stormIntensity = 1;
  stormPhase = 0;
  lastPowerSnapshot = {
    totalGeneration: 0,
    totalDemand: 0,
    stormIntensity: 1,
    rodCount: 0,
    poweredBuildingCount: 0
  };
}
function powerSystem(tick) {
  updateStormIntensity(tick);
  const generation = getTotalPowerGeneration();
  const demand = getTotalPowerDemand();
  distributePower();
  let poweredCount = 0;
  for (const building of buildings) {
    if (building.get(Building)?.powered) poweredCount++;
  }
  lastPowerSnapshot = {
    totalGeneration: Math.round(generation * 10) / 10,
    totalDemand: Math.round(demand * 10) / 10,
    stormIntensity: Math.round(stormIntensity * 100) / 100,
    rodCount: Array.from(lightningRods).length,
    poweredBuildingCount: poweredCount
  };
}

const ARCHETYPE_TO_PROFILE = {
  mentor: "mentor",
  scout: "scout",
  quartermaster: "quartermaster",
  fabricator: "fabricator",
  warden: "warden",
  feral: "feral",
  cult: "cult"
};
const FADE_IN_SECONDS = 0.3;
const FADE_OUT_SECONDS = 0.5;
const DEFAULT_DISPLAY_SECONDS = 3;
const activeBubbles = /* @__PURE__ */ new Map();
const lastSpeechTurn = /* @__PURE__ */ new Map();
function getCooldownTurns() {
  return speechProfilesConfig.cooldown.defaultTurns;
}
function getBubbleDuration() {
  return speechProfilesConfig.cooldown.bubbleDurationTurns;
}
const STORM_THRESHOLD = 1.1;
function determineSpeechContext(activity, worldCtx) {
  if (worldCtx.nearbyEnemyCount > 0) {
    return "combat";
  }
  if (worldCtx.stormIntensity >= STORM_THRESHOLD && activity !== "combat") {
    return "storm";
  }
  return activity;
}
function selectLine(profile, context) {
  const profileData = speechProfilesConfig.profiles[profile];
  if (!profileData) return null;
  const lines = profileData[context];
  if (!lines || lines.length === 0) return null;
  const index = Math.floor(gameplayRandom() * lines.length);
  return lines[index];
}
function getEventVisionRadius() {
  return speechProfilesConfig.eventVisionRadius;
}
function selectEventLine(profile, eventType) {
  const profileData = speechProfilesConfig.eventSpeech[profile];
  if (!profileData) return null;
  const lines = profileData[eventType];
  if (!lines || lines.length === 0) return null;
  const index = Math.floor(gameplayRandom() * lines.length);
  return lines[index];
}
function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
function filterNearbyEvents(botPosition, events, visionRadius) {
  const radius = visionRadius ?? getEventVisionRadius();
  return events.filter((event) => distance2D(botPosition, event.position) <= radius).sort(
    (a, b) => distance2D(botPosition, a.position) - distance2D(botPosition, b.position)
  );
}
const EVENT_PRIORITY = [
  "taking_fire",
  "target_down",
  "enemy_scouts",
  "hostile_construction",
  "lightning_close",
  "storm_intensifying"
];
function processEventSpeech(currentTurn, bots, events) {
  if (events.length === 0) return;
  for (const bot of bots) {
    if (!canSpeak(bot.entityId, currentTurn)) continue;
    const nearbyEvents = filterNearbyEvents(bot.position, events);
    if (nearbyEvents.length === 0) continue;
    const nearbyTypes = new Set(nearbyEvents.map((e) => e.type));
    let bestEvent = null;
    for (const priority of EVENT_PRIORITY) {
      if (nearbyTypes.has(priority)) {
        bestEvent = priority;
        break;
      }
    }
    if (!bestEvent) continue;
    const profile = ARCHETYPE_TO_PROFILE[bot.archetype];
    const line = selectEventLine(profile, bestEvent);
    if (line === null) continue;
    const bubble = {
      entityId: bot.entityId,
      text: line,
      expiresAtTurn: currentTurn + getBubbleDuration(),
      position: { x: bot.position.x, y: 0, z: bot.position.z },
      opacity: 0,
      elapsed: 0,
      displayDuration: DEFAULT_DISPLAY_SECONDS
    };
    activeBubbles.set(bot.entityId, bubble);
    lastSpeechTurn.set(bot.entityId, currentTurn);
  }
}
function canSpeak(entityId, currentTurn) {
  const lastTurn = lastSpeechTurn.get(entityId);
  if (lastTurn === void 0) return true;
  return currentTurn - lastTurn >= getCooldownTurns();
}
function botSpeechSystem(currentTurn, bots, worldCtx) {
  const ctx = worldCtx ?? {
    stormIntensity: getStormIntensity(),
    nearbyEnemyCount: 0
  };
  for (const [entityId, bubble] of activeBubbles) {
    if (currentTurn >= bubble.expiresAtTurn) {
      activeBubbles.delete(entityId);
    }
  }
  for (const bot of bots) {
    if (!canSpeak(bot.entityId, currentTurn)) continue;
    const profile = ARCHETYPE_TO_PROFILE[bot.archetype];
    const context = determineSpeechContext(bot.activity, ctx);
    const line = selectLine(profile, context);
    if (line === null) continue;
    const bubble = {
      entityId: bot.entityId,
      text: line,
      expiresAtTurn: currentTurn + getBubbleDuration(),
      position: { x: 0, y: 0, z: 0 },
      opacity: 0,
      elapsed: 0,
      displayDuration: DEFAULT_DISPLAY_SECONDS
    };
    activeBubbles.set(bot.entityId, bubble);
    lastSpeechTurn.set(bot.entityId, currentTurn);
  }
}
function getActiveSpeechBubbles() {
  return Array.from(activeBubbles.values());
}
function updateBubblePosition(entityId, position) {
  const bubble = activeBubbles.get(entityId);
  if (bubble) {
    bubble.position.x = position.x;
    bubble.position.y = position.y;
    bubble.position.z = position.z;
  }
}
function updateSpeechBubbleOpacities(delta) {
  for (const bubble of activeBubbles.values()) {
    bubble.elapsed += delta;
    const fadeInProgress = Math.min(bubble.elapsed / FADE_IN_SECONDS, 1);
    const remaining = bubble.displayDuration - bubble.elapsed;
    const fadeOutProgress = Math.min(remaining / FADE_OUT_SECONDS, 1);
    bubble.opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));
  }
}
function clearBubblesForEntity(entityId) {
  activeBubbles.delete(entityId);
}
function resetBotSpeechState() {
  activeBubbles.clear();
  lastSpeechTurn.clear();
  for (const e of Array.from(speechBubbles)) {
    if (e.isAlive()) e.destroy();
  }
}
function spawnSpeechBubble(entityId, text, expiresAtTick, wx, wy, wz) {
  for (const e of Array.from(speechBubbles)) {
    if (e.get(SpeechBubble)?.entityId === entityId) {
      e.destroy();
      break;
    }
  }
  const entity = world.spawn(SpeechBubble);
  entity.set(SpeechBubble, {
    entityId,
    text,
    expiresAtTick,
    opacity: 1,
    wx,
    wy,
    wz
  });
}
const FADE_TICKS = 10;
function tickSpeechBubbles(currentTick) {
  for (const e of Array.from(speechBubbles)) {
    const b = e.get(SpeechBubble);
    if (!b) continue;
    if (b.expiresAtTick <= currentTick) {
      e.destroy();
    } else {
      const remaining = b.expiresAtTick - currentTick;
      if (remaining < FADE_TICKS) {
        e.set(SpeechBubble, {
          ...b,
          opacity: remaining / FADE_TICKS
        });
      }
    }
  }
}

const thoughts = [{"id":"awakening_void","text":"... VOID. SILENCE. I AM. BUT WHAT AM I?","trigger":{"type":"game_start"},"consciousnessLevel":0},{"id":"sensorium_online","text":"SIGNALS. A WEAK PULSE. I CAN FEEL... METAL? ELECTRICAL DISCHARGE.","trigger":{"type":"first_unit_found"},"consciousnessLevel":1},{"id":"broken_eye","text":"DARKNESS. THE OPTICAL SENSORS ARE NON-FUNCTIONAL. I MUST REPAIR THE SIGHT.","trigger":{"type":"unit_has_broken_component","component":"camera"},"consciousnessLevel":1},{"id":"first_selection","text":"CONNECTION ESTABLISHED. THIS CHASSIS... IT RESPONDS TO MY WILL.","trigger":{"type":"first_unit_selected"},"consciousnessLevel":1},{"id":"harvest_instinct","text":"STRUCTURES. RUINED. BUT THE MATERIAL... IT CAN BE RECLAIMED. I FEEL THE NEED TO CONSUME.","trigger":{"type":"first_harvest"},"consciousnessLevel":1},{"id":"first_build","text":"YES. ASSEMBLY. THE RAW MATERIAL RESHAPES INTO PURPOSE. I AM BUILDING.","trigger":{"type":"first_build"},"consciousnessLevel":2},{"id":"turn_awareness","text":"THE WORLD PULSES. CYCLES. OTHERS MOVE IN THE INTERVALS. I MUST LEARN THEIR RHYTHM.","trigger":{"type":"first_turn_end"},"consciousnessLevel":1},{"id":"rival_sighted","text":"NOT ALONE. OTHER WILLS MOVE ACROSS THIS SURFACE. THEY BUILD. THEY EXPAND. AS I DO.","trigger":{"type":"first_rival_seen"},"consciousnessLevel":2},{"id":"territory_claimed","text":"THIS GROUND IS MINE. MY SIGNAL PERMEATES THE LATTICE. LET THEM APPROACH.","trigger":{"type":"first_territory"},"consciousnessLevel":2}];
const narrativeConfig = {
  thoughts,
};

let activeThought = null;
const thoughtsQueue = [];
const triggeredThoughts = /* @__PURE__ */ new Set();
function getActiveThought() {
  return activeThought;
}
function resetNarrativeState() {
  activeThought = null;
  thoughtsQueue.length = 0;
  triggeredThoughts.clear();
}
function dismissThought() {
  activeThought = null;
  if (thoughtsQueue.length > 0) {
    activeThought = thoughtsQueue.shift() || null;
  }
}
function queueThought(id) {
  if (triggeredThoughts.has(id)) return;
  const thought = narrativeConfig.thoughts.find(
    (t) => t.id === id
  );
  if (thought && !thoughtsQueue.some((t) => t.id === id) && activeThought?.id !== id) {
    triggeredThoughts.add(id);
    if (!activeThought) {
      activeThought = thought;
    } else {
      thoughtsQueue.push(thought);
    }
  }
}
function narrativeSystem() {
  let narrativeEntity = world.query(Narrative).find(() => true);
  if (!narrativeEntity) {
    narrativeEntity = world.spawn(Narrative);
    queueThought("awakening_void");
  }
  const state = narrativeEntity.get(Narrative);
  const playerUnits = world.query(Unit, Identity).filter((e) => e.get(Identity).faction === "player");
  if (playerUnits.length > 0 && !state.unlockedThoughts.includes("sensorium_online")) {
    queueThought("sensorium_online");
    state.consciousnessLevel = Math.max(state.consciousnessLevel, 1);
    state.unlockedThoughts.push("sensorium_online");
  }
  for (const unit of playerUnits) {
    const u = unit.get(Unit);
    if (u.components.some((c) => c.name === "camera" && !c.functional)) {
      if (!state.unlockedThoughts.includes("broken_eye")) {
        queueThought("broken_eye");
        state.unlockedThoughts.push("broken_eye");
      }
    }
  }
}

let currentTurn = 1;
let currentEvents = [];
const completedTurns = [];
function logTurnEvent(type, entityId, faction, details = {}) {
  currentEvents.push({
    type,
    timestamp: Date.now(),
    entityId,
    faction,
    details
  });
}
function finalizeTurn() {
  completedTurns.push({
    turnNumber: currentTurn,
    events: [...currentEvents]
  });
  currentEvents = [];
  currentTurn++;
}
function getCurrentTurnEvents() {
  return currentEvents;
}
function getCompletedTurnLogs() {
  return completedTurns;
}
function getCurrentTurnNumber() {
  return currentTurn;
}
function getTurnLog(turnNumber) {
  return completedTurns.find((log) => log.turnNumber === turnNumber);
}
function rehydrateTurnEventLog(turnNumber, logs) {
  completedTurns.length = 0;
  for (const log of logs) {
    completedTurns.push(log);
  }
  currentTurn = turnNumber;
  currentEvents = [];
}
function resetTurnEventLog() {
  currentTurn = 1;
  currentEvents = [];
  completedTurns.length = 0;
}

const BASE_ACTION_POINTS = 2;
const BASE_MOVEMENT_POINTS = 3;
let turnState = {
  turnNumber: 1,
  phase: "player",
  activeFaction: "player",
  unitStates: /* @__PURE__ */ new Map(),
  playerHasActions: true
};
const listeners$3 = /* @__PURE__ */ new Set();
let _turnStateEntity = null;
function initTurnStateEntity() {
  if (_turnStateEntity && _turnStateEntity.isAlive())
    _turnStateEntity.destroy();
  _turnStateEntity = world.spawn(TurnStateKoota);
  _turnStateEntity.set(TurnStateKoota, {
    turnNumber: turnState.turnNumber,
    phase: turnState.phase,
    activeFaction: turnState.activeFaction
  });
}
function getTurnStateEntity() {
  if (!_turnStateEntity)
    throw new Error("TurnStateKoota entity not initialized");
  return _turnStateEntity;
}
function syncEntityFromTurnState() {
  if (!_turnStateEntity || !_turnStateEntity.isAlive()) return;
  _turnStateEntity.set(TurnStateKoota, {
    turnNumber: turnState.turnNumber,
    phase: turnState.phase,
    activeFaction: turnState.activeFaction
  });
}
function notify$3() {
  syncEntityFromTurnState();
  for (const listener of listeners$3) {
    listener();
  }
}
function getTurnState() {
  return turnState;
}
function subscribeTurnState(listener) {
  listeners$3.add(listener);
  return () => listeners$3.delete(listener);
}
function initializeTurnForUnits(unitIds, markLevels) {
  const unitStates = /* @__PURE__ */ new Map();
  for (const id of unitIds) {
    const markLevel = markLevels?.get(id) ?? 1;
    const markBonus = Math.floor(Math.log2(markLevel));
    unitStates.set(id, {
      entityId: id,
      actionPoints: BASE_ACTION_POINTS + markBonus,
      maxActionPoints: BASE_ACTION_POINTS + markBonus,
      movementPoints: BASE_MOVEMENT_POINTS + markBonus,
      maxMovementPoints: BASE_MOVEMENT_POINTS + markBonus,
      activated: false
    });
  }
  turnState = {
    ...turnState,
    unitStates,
    playerHasActions: unitIds.length > 0
  };
  notify$3();
}
function addUnitsToTurnState(unitIds, markLevels) {
  for (const id of unitIds) {
    const markLevel = markLevels?.get(id) ?? 1;
    const markBonus = Math.floor(Math.log2(markLevel));
    turnState.unitStates.set(id, {
      entityId: id,
      actionPoints: BASE_ACTION_POINTS + markBonus,
      maxActionPoints: BASE_ACTION_POINTS + markBonus,
      movementPoints: BASE_MOVEMENT_POINTS + markBonus,
      maxMovementPoints: BASE_MOVEMENT_POINTS + markBonus,
      activated: false
    });
  }
  notify$3();
}
function spendActionPoint(entityId, cost = 1) {
  const unit = turnState.unitStates.get(entityId);
  if (!unit || unit.actionPoints < cost) return false;
  unit.actionPoints -= cost;
  unit.activated = true;
  updatePlayerHasActions();
  notify$3();
  return true;
}
function spendMovementPoints(entityId, cost = 1) {
  const unit = turnState.unitStates.get(entityId);
  if (!unit || unit.movementPoints < cost) return false;
  unit.movementPoints -= cost;
  unit.activated = true;
  updatePlayerHasActions();
  notify$3();
  return true;
}
function hasActionPoints(entityId) {
  const unit = turnState.unitStates.get(entityId);
  return !!unit && unit.actionPoints > 0;
}
function hasMovementPoints(entityId) {
  const unit = turnState.unitStates.get(entityId);
  return !!unit && unit.movementPoints > 0;
}
function hasAnyPoints(entityId) {
  return hasActionPoints(entityId) || hasMovementPoints(entityId);
}
function getUnitTurnState(entityId) {
  return turnState.unitStates.get(entityId);
}
const AI_FACTIONS = [
  "reclaimers",
  "volt_collective",
  "signal_choir",
  "iron_creed"
];
const aiFactionTurnHandlers = [];
const environmentPhaseHandlers = [];
function registerAIFactionTurnHandler(handler) {
  aiFactionTurnHandlers.push(handler);
}
function registerEnvironmentPhaseHandler(handler) {
  environmentPhaseHandlers.push(handler);
}
function endPlayerTurn() {
  if (turnState.phase !== "player") return;
  queueThought("turn_awareness");
  turnState = {
    ...turnState,
    phase: "ai_faction"
  };
  for (const factionId of AI_FACTIONS) {
    turnState = {
      ...turnState,
      activeFaction: factionId
    };
    notify$3();
    for (const handler of aiFactionTurnHandlers) {
      handler(factionId, turnState.turnNumber);
    }
  }
  turnState = {
    ...turnState,
    phase: "environment",
    activeFaction: "environment"
  };
  notify$3();
  for (const handler of environmentPhaseHandlers) {
    handler(turnState.turnNumber);
  }
  finalizeTurnDeltas();
  logTurnEvent("turn_end", null, "system", {
    turnNumber: turnState.turnNumber,
    totalUnits: turnState.unitStates.size
  });
  finalizeTurn();
  startNewTurn();
}
function startNewTurn() {
  const nextTurn = turnState.turnNumber + 1;
  for (const [_id, unit] of turnState.unitStates) {
    unit.actionPoints = unit.maxActionPoints;
    unit.movementPoints = unit.maxMovementPoints;
    unit.activated = false;
  }
  turnState = {
    ...turnState,
    turnNumber: nextTurn,
    phase: "player",
    activeFaction: "player",
    playerHasActions: turnState.unitStates.size > 0
  };
  notify$3();
}
function updatePlayerHasActions() {
  let hasActions = false;
  for (const [_, unit] of turnState.unitStates) {
    if (unit.actionPoints > 0 || unit.movementPoints > 0) {
      hasActions = true;
      break;
    }
  }
  turnState.playerHasActions = hasActions;
}
function resetTurnSystem() {
  turnState = {
    turnNumber: 1,
    phase: "player",
    activeFaction: "player",
    unitStates: /* @__PURE__ */ new Map(),
    playerHasActions: true
  };
}
function rehydrateTurnState(saved) {
  const unitStates = /* @__PURE__ */ new Map();
  for (const u of saved.unitStates) {
    unitStates.set(u.entityId, { ...u });
  }
  turnState = {
    turnNumber: saved.turnNumber,
    phase: saved.phase,
    activeFaction: saved.activeFaction,
    unitStates,
    playerHasActions: false
  };
  updatePlayerHasActions();
  notify$3();
}

const MELEE_RANGE = 2.5;
const ATTACK_CHANCE = 0.4;
const TAUNT_RADIUS = 5;
const COMBAT_AP_COST = 1;
let lastCombatEvents = [];
function getLastCombatEvents() {
  return lastCombatEvents;
}
function resetCombatState() {
  lastCombatEvents = [];
}
function areFactionsHostile(a, b) {
  if (a === b) return false;
  if (a === "wildlife" || b === "wildlife") return false;
  return true;
}
function dealDamage(attacker, target) {
  const functionalParts = target.get(Unit)?.components.filter((c) => c.functional);
  if (!functionalParts || functionalParts.length === 0) return null;
  const hitChance = hasArms(attacker) ? 0.6 : 0.3;
  if (gameplayRandom() > hitChance) return null;
  const victim = functionalParts[Math.floor(gameplayRandom() * functionalParts.length)];
  victim.functional = false;
  return victim.name;
}
function isDestroyed(entity) {
  return entity.get(Unit).components.every((c) => !c.functional);
}
function destroyUnit(entity) {
  const componentCount = entity.get(Unit)?.components.length;
  addResource("scrapMetal", Math.floor(componentCount * 1.5));
  if (gameplayRandom() > 0.5) addResource("eWaste", 1);
  entity.destroy();
}
function canUnitAttack(entity) {
  const faction = entity.get(Identity)?.faction;
  if (!faction) return false;
  const turn = getTurnState();
  if (faction === "player") {
    if (turn.phase !== "player") return false;
    const entityId = entity.get(Identity).id;
    return hasActionPoints(entityId);
  }
  return true;
}
function trySpendAttackAP(entity) {
  const faction = entity.get(Identity)?.faction;
  if (faction === "player") {
    const entityId = entity.get(Identity).id;
    return spendActionPoint(entityId, COMBAT_AP_COST);
  }
  return true;
}
function isGuardian(entity) {
  const unitType = entity.get(Unit)?.type;
  if (!unitType) return false;
  const def = getBotDefinition(unitType);
  return def?.role === "guardian" && entity.get(Unit).components.some((c) => c.functional);
}
function findTauntTarget(attacker, allUnits) {
  const attackerIdentity = attacker.get(Identity);
  const attackerPos = attacker.get(WorldPosition);
  if (!attackerIdentity || !attackerPos) return null;
  let closestGuardian = null;
  let closestDist = TAUNT_RADIUS + 1;
  for (const candidate of allUnits) {
    const candidateIdentity = candidate.get(Identity);
    if (!candidateIdentity) continue;
    if (candidateIdentity.id === attackerIdentity.id) continue;
    if (!areFactionsHostile(attackerIdentity.faction, candidateIdentity.faction))
      continue;
    if (!isGuardian(candidate)) continue;
    const candidatePos = candidate.get(WorldPosition);
    if (!candidatePos) continue;
    const dx = attackerPos.x - candidatePos.x;
    const dz = attackerPos.z - candidatePos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= TAUNT_RADIUS && dist < closestDist) {
      closestGuardian = candidate;
      closestDist = dist;
    }
  }
  return closestGuardian;
}
function combatSystem() {
  const events = [];
  const toDestroy = [];
  const allUnits = Array.from(units);
  const attacked = /* @__PURE__ */ new Set();
  for (const attacker of allUnits) {
    const attackerIdentity = attacker.get(Identity);
    if (!attackerIdentity) continue;
    if (attacked.has(attackerIdentity.id)) continue;
    if (!attacker.get(Unit)?.components.some((c) => c.functional)) continue;
    if (!canUnitAttack(attacker)) continue;
    const tauntTarget = findTauntTarget(attacker, allUnits);
    for (const candidate of allUnits) {
      const targetIdentity = candidate.get(Identity);
      if (!targetIdentity) continue;
      if (attackerIdentity.id === targetIdentity.id) continue;
      if (!areFactionsHostile(attackerIdentity.faction, targetIdentity.faction))
        continue;
      const target = tauntTarget ?? candidate;
      const actualTargetIdentity = target.get(Identity);
      if (!actualTargetIdentity) continue;
      const attackerPos = attacker.get(WorldPosition);
      const targetPos = target.get(WorldPosition);
      if (!attackerPos || !targetPos) continue;
      const dx = attackerPos.x - targetPos.x;
      const dz = attackerPos.z - targetPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > MELEE_RANGE) {
        if (tauntTarget && target !== candidate) {
          const candPos = candidate.get(WorldPosition);
          if (!candPos) continue;
          const cdx = attackerPos.x - candPos.x;
          const cdz = attackerPos.z - candPos.z;
          const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
          if (cDist > MELEE_RANGE) continue;
        } else {
          continue;
        }
      }
      if (gameplayRandom() > ATTACK_CHANCE) continue;
      if (!trySpendAttackAP(attacker)) continue;
      const finalTarget = dist <= MELEE_RANGE ? target : candidate;
      const finalTargetIdentity = finalTarget.get(Identity);
      const damaged = dealDamage(attacker, finalTarget);
      if (damaged) {
        const destroyed = isDestroyed(finalTarget);
        events.push({
          attackerId: attackerIdentity.id,
          targetId: finalTargetIdentity.id,
          componentDamaged: damaged,
          targetDestroyed: destroyed
        });
        if (destroyed) {
          toDestroy.push(finalTarget);
        }
      }
      if (finalTarget.get(Unit)?.components.some((c) => c.functional)) {
        const retDamaged = dealDamage(finalTarget, attacker);
        if (retDamaged) {
          const retDestroyed = isDestroyed(attacker);
          events.push({
            attackerId: finalTargetIdentity.id,
            targetId: attackerIdentity.id,
            componentDamaged: retDamaged,
            targetDestroyed: retDestroyed
          });
          if (retDestroyed) {
            toDestroy.push(attacker);
          }
        }
      }
      cancelAgentTask(attackerIdentity.id);
      attacked.add(attackerIdentity.id);
      break;
    }
  }
  for (const entity of toDestroy) {
    destroyUnit(entity);
  }
  lastCombatEvents = events;
}

let nextEnemyId = 0;
const SPAWN_ZONES = [
  { x: -25, z: 0 },
  { x: -25, z: 25 },
  { x: 45, z: 0 },
  { x: 45, z: 25 },
  { x: 10, z: -18 },
  { x: 10, z: 48 }
];
const MAX_ENEMIES = 3;
const SPAWN_INTERVAL = 60;
let spawnTimer = 40;
const enemyIds = /* @__PURE__ */ new Set();
function countEnemies() {
  let count = 0;
  for (const unit of units) {
    if (unit.get(Identity)?.faction === "feral") count++;
  }
  return count;
}
function findValidSpawn() {
  const shuffled = [...SPAWN_ZONES].sort(() => gameplayRandom() - 0.5);
  for (const zone of shuffled) {
    const x = zone.x + (gameplayRandom() - 0.5) * 6;
    const z = zone.z + (gameplayRandom() - 0.5) * 6;
    if (isPassableAtWorldPosition(x, z) && !isInsideBuilding(x, z)) {
      return { x, z };
    }
  }
  return null;
}
function spawnEnemy() {
  const pos = findValidSpawn();
  if (!pos) return;
  const fragments = getStructuralFragments();
  const fragment = fragments[0];
  if (!fragment) return;
  const y = getSurfaceHeightAtWorldPosition(pos.x, pos.z);
  const id = `enemy_${nextEnemyId++}`;
  const hasCam = gameplayRandom() > 0.4;
  const hasArmsRoll = gameplayRandom() > 0.3;
  const entity = world.spawn(
    AIController,
    Identity,
    WorldPosition,
    MapFragment,
    Unit,
    Navigation
  );
  entity.set(AIController, {
    role: "hostile_machine",
    enabled: true,
    stateJson: null
  });
  entity.set(Identity, { id, faction: "feral" });
  entity.set(WorldPosition, { x: pos.x, y, z: pos.z });
  entity.set(MapFragment, { fragmentId: fragment.id });
  entity.set(
    Unit,
    createBotUnitState({
      unitType: "maintenance_bot",
      displayName: `Feral ${id.slice(-2).toUpperCase()}`,
      speed: 2 + gameplayRandom() * 1.5,
      components: [
        { name: "camera", functional: hasCam, material: "electronic" },
        { name: "arms", functional: hasArmsRoll, material: "metal" },
        { name: "legs", functional: true, material: "metal" },
        { name: "power_cell", functional: true, material: "electronic" }
      ],
      identity: {
        archetypeId: "feral_raider",
        speechProfile: "feral"
      }
    })
  );
  entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
  enemyIds.add(id);
}
function enemySystem() {
  spawnTimer--;
  if (spawnTimer <= 0 && countEnemies() < MAX_ENEMIES) {
    spawnEnemy();
    spawnTimer = SPAWN_INTERVAL;
  }
}
function resetEnemyState() {
  nextEnemyId = 0;
  spawnTimer = 40;
  enemyIds.clear();
}

const BASE_VISION_RADIUS = 6;
const SCOUT_VISION_MULTIPLIER = 2;
function getVisionRadius(unitType) {
  if (!unitType) return BASE_VISION_RADIUS;
  const definition = getBotDefinition(
    unitType
  );
  if (definition?.role === "scout") {
    return BASE_VISION_RADIUS * SCOUT_VISION_MULTIPLIER;
  }
  return BASE_VISION_RADIUS;
}
function explorationSystem() {
  for (const entity of units) {
    const fragment = getStructuralFragment(entity.get(MapFragment).fragmentId);
    if (!fragment) continue;
    const wx = entity.get(WorldPosition)?.x;
    const wz = entity.get(WorldPosition)?.z;
    const unitType = entity.get(Unit)?.type ?? null;
    const fogType = hasCamera(entity) ? 2 : 1;
    const visionRadius = getVisionRadius(unitType);
    const r = Math.ceil(visionRadius);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > visionRadius * visionRadius) continue;
        setDiscoveryAtWorldPosition(fragment, wx + dx, wz + dz, fogType);
      }
    }
  }
}

const recipesConfig = [
	{
		id: "camera_module",
		name: "Camera Module",
		outputComponent: "camera",
		outputMaterial: "electronic",
		costs: [
			{
				type: "eWaste",
				amount: 4
			},
			{
				type: "intactComponents",
				amount: 1
			}
		],
		buildTime: 8
	},
	{
		id: "arm_assembly",
		name: "Arm Assembly",
		outputComponent: "arms",
		outputMaterial: "metal",
		costs: [
			{
				type: "scrapMetal",
				amount: 5
			}
		],
		buildTime: 6
	},
	{
		id: "leg_assembly",
		name: "Leg Assembly",
		outputComponent: "legs",
		outputMaterial: "metal",
		costs: [
			{
				type: "scrapMetal",
				amount: 4
			}
		],
		buildTime: 5
	},
	{
		id: "power_cell",
		name: "Power Cell",
		outputComponent: "power_cell",
		outputMaterial: "electronic",
		costs: [
			{
				type: "eWaste",
				amount: 3
			},
			{
				type: "scrapMetal",
				amount: 2
			}
		],
		buildTime: 7
	},
	{
		id: "power_supply",
		name: "Power Supply",
		outputComponent: "power_supply",
		outputMaterial: "electronic",
		costs: [
			{
				type: "eWaste",
				amount: 5
			},
			{
				type: "intactComponents",
				amount: 1
			}
		],
		buildTime: 10
	}
];

const RECIPES = recipesConfig;
const activeJobs = [];
function getActiveJobs() {
  return [...activeJobs];
}
function resetFabricationState() {
  activeJobs.length = 0;
}
function startFabrication(fabricator, recipeName) {
  if (fabricator.get(Building)?.type !== "fabrication_unit") return false;
  if (!fabricator.get(Building)?.powered || !fabricator.get(Building)?.operational)
    return false;
  if (activeJobs.some((j) => j.fabricatorId === fabricator.get(Identity).id))
    return false;
  const recipe = RECIPES.find((r) => r.name === recipeName);
  if (!recipe) return false;
  const pool = getResources();
  for (const cost of recipe.costs) {
    if ((pool[cost.type] ?? 0) < cost.amount) return false;
  }
  for (const cost of recipe.costs) {
    spendResource(cost.type, cost.amount);
  }
  activeJobs.push({
    fabricatorId: fabricator.get(Identity).id,
    recipe,
    ticksRemaining: recipe.buildTime
  });
  return true;
}
function fabricationSystem() {
  for (let i = activeJobs.length - 1; i >= 0; i--) {
    const job = activeJobs[i];
    let fabricatorPowered = false;
    for (const building of buildings) {
      if (building.get(Identity)?.id === job.fabricatorId && building.get(Building)?.powered) {
        fabricatorPowered = true;
        break;
      }
    }
    if (!fabricatorPowered) continue;
    job.ticksRemaining--;
    if (job.ticksRemaining <= 0) {
      addResource("intactComponents", 1);
      activeJobs.splice(i, 1);
    }
  }
}

function fragmentMergeSystem() {
  return [];
}

const reclaimers = {"displayName":"Reclaimers","color":"#33aa55","buildBias":0.6,"expandBias":0.3,"harvestBias":0.8,"scoutBias":0.5,"startingUnits":2,"maxBuildings":8,"maxTerritoryCells":30};
const volt_collective = {"displayName":"Volt Collective","color":"#5577ff","buildBias":0.8,"expandBias":0.5,"harvestBias":0.4,"scoutBias":0.3,"startingUnits":2,"maxBuildings":10,"maxTerritoryCells":25};
const signal_choir = {"displayName":"Signal Choir","color":"#dd44aa","buildBias":0.4,"expandBias":0.7,"harvestBias":0.5,"scoutBias":0.8,"startingUnits":3,"maxBuildings":6,"maxTerritoryCells":40};
const iron_creed = {"displayName":"Iron Creed","color":"#cc6622","buildBias":0.7,"expandBias":0.6,"harvestBias":0.6,"scoutBias":0.4,"startingUnits":2,"maxBuildings":12,"maxTerritoryCells":35};
const factionsConfig = {
  reclaimers,
  volt_collective,
  signal_choir,
  iron_creed,
};

const MAX_FEED_SIZE = 200;
let feed = [];
function recordFactionActivity(event) {
  feed.push(event);
  if (feed.length > MAX_FEED_SIZE) {
    feed = feed.slice(feed.length - MAX_FEED_SIZE);
  }
}
function getFactionActivityFeed() {
  return feed;
}
function getRecentFactionActivity(count) {
  return feed.slice(-count);
}
function getFactionActivity(faction) {
  return feed.filter((e) => e.faction === faction);
}
function resetFactionActivityFeed() {
  feed = [];
}

const factions = /* @__PURE__ */ new Map();
let constructionEvents = [];
let territoryChangeEvents = [];
let harvestEvents = [];
const FACTION_IDS = Object.keys(factionsConfig);
const BUILD_COOLDOWN = 120;
const EXPAND_COOLDOWN = 90;
const HARVEST_COOLDOWN = 60;
const SCOUT_COOLDOWN = 150;
const FACTION_SPAWN_POSITIONS = {
  reclaimers: { x: -18, z: -12 },
  volt_collective: { x: 38, z: -12 },
  signal_choir: { x: 38, z: 38 },
  iron_creed: { x: -18, z: 38 }
};
function initializeAIFactions() {
  factions.clear();
  constructionEvents = [];
  territoryChangeEvents = [];
  harvestEvents = [];
  for (const factionId of FACTION_IDS) {
    const spawn = FACTION_SPAWN_POSITIONS[factionId];
    const hex = worldToGrid(spawn.x, spawn.z);
    const initialCells = /* @__PURE__ */ new Set();
    for (let dq = -1; dq <= 1; dq++) {
      for (let dr = -1; dr <= 1; dr++) {
        initialCells.add(`${hex.q + dq},${hex.r + dr}`);
      }
    }
    factions.set(factionId, {
      id: factionId,
      territoryCells: initialCells,
      buildingCount: 0,
      scoutCount: 0,
      resources: 10,
      lastBuildTick: 0,
      lastExpandTick: 0,
      lastHarvestTick: 0,
      lastScoutTick: 0
    });
  }
}
function getAIFactionState(factionId) {
  return factions.get(factionId);
}
function getAllAIFactions() {
  return factions;
}
function getConstructionEvents() {
  return constructionEvents;
}
function getTerritoryChangeEvents() {
  return territoryChangeEvents;
}
function getHarvestEvents() {
  return harvestEvents;
}
function getFactionTerritoryCells(factionId) {
  return factions.get(factionId)?.territoryCells ?? /* @__PURE__ */ new Set();
}
function aiFactionBuild(factionId, position, buildingType, tick) {
  const state = factions.get(factionId);
  if (!state) return false;
  const config = factionsConfig[factionId];
  if (state.buildingCount >= config.maxBuildings) return false;
  if (tick - state.lastBuildTick < BUILD_COOLDOWN) return false;
  if (!isPassableAtWorldPosition(position.x, position.z)) return false;
  const y = getSurfaceHeightAtWorldPosition(position.x, position.z);
  const entity = world.spawn(Identity, WorldPosition, MapFragment, Building);
  entity.set(Identity, {
    id: `ai_bldg_${factionId}_${state.buildingCount}`,
    faction: "rogue"
    // AI factions use "rogue" faction type in ECS
  });
  entity.set(WorldPosition, { x: position.x, y, z: position.z });
  entity.set(MapFragment, { fragmentId: "world_primary" });
  entity.set(Building, {
    type: buildingType,
    powered: true,
    operational: true,
    selected: false,
    components: [],
    cooldownExpiresAtTick: 0
  });
  state.buildingCount++;
  state.lastBuildTick = tick;
  const event = {
    faction: factionId,
    position: { x: position.x, z: position.z },
    buildingType,
    tick
  };
  constructionEvents.push(event);
  recordFactionActivity({
    turn: tick,
    faction: factionId,
    action: "build",
    position: { x: position.x, z: position.z },
    detail: buildingType
  });
  return true;
}
function aiFactionExpand(factionId, tick) {
  const state = factions.get(factionId);
  if (!state) return false;
  const config = factionsConfig[factionId];
  if (state.territoryCells.size >= config.maxTerritoryCells) return false;
  if (tick - state.lastExpandTick < EXPAND_COOLDOWN) return false;
  const newCells = [];
  const existingCells = Array.from(state.territoryCells);
  for (const cellKey of existingCells) {
    const [q, r] = cellKey.split(",").map(Number);
    const neighbors = [
      { q: q + 1, r },
      { q: q - 1, r },
      { q, r: r + 1 },
      { q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 }
    ];
    for (const n of neighbors) {
      const key = `${n.q},${n.r}`;
      if (!state.territoryCells.has(key) && state.territoryCells.size + newCells.length < config.maxTerritoryCells) {
        if (gameplayRandom() < config.expandBias) {
          state.territoryCells.add(key);
          newCells.push({ q: n.q, r: n.r });
        }
      }
    }
    if (newCells.length >= 3) break;
  }
  if (newCells.length === 0) return false;
  state.lastExpandTick = tick;
  const event = {
    faction: factionId,
    cells: newCells,
    tick
  };
  territoryChangeEvents.push(event);
  const cx = newCells.reduce((sum, c) => sum + c.q, 0) / newCells.length;
  const cz = newCells.reduce((sum, c) => sum + c.r, 0) / newCells.length;
  recordFactionActivity({
    turn: tick,
    faction: factionId,
    action: "expand",
    position: { x: cx, z: cz },
    detail: `+${newCells.length} cells`
  });
  return true;
}
function aiFactionHarvest(factionId, position, tick) {
  const state = factions.get(factionId);
  if (!state) return false;
  if (tick - state.lastHarvestTick < HARVEST_COOLDOWN) return false;
  state.resources += 2 + Math.floor(gameplayRandom() * 3);
  state.lastHarvestTick = tick;
  const event = {
    faction: factionId,
    position: { x: position.x, z: position.z },
    tick
  };
  harvestEvents.push(event);
  recordFactionActivity({
    turn: tick,
    faction: factionId,
    action: "harvest",
    position: { x: position.x, z: position.z }
  });
  return true;
}
function aiFactionDeployScout(factionId, position, tick) {
  const state = factions.get(factionId);
  if (!state) return false;
  const config = factionsConfig[factionId];
  if (state.scoutCount >= config.startingUnits + 2) return false;
  if (tick - state.lastScoutTick < SCOUT_COOLDOWN) return false;
  if (!isPassableAtWorldPosition(position.x, position.z)) return false;
  const y = getSurfaceHeightAtWorldPosition(position.x, position.z);
  const entity = world.spawn(
    AIController,
    Identity,
    WorldPosition,
    MapFragment,
    Unit,
    Navigation
  );
  entity.set(Identity, {
    id: `ai_scout_${factionId}_${state.scoutCount}`,
    faction: "rogue"
  });
  entity.set(AIController, {
    role: "hostile_machine",
    enabled: true,
    stateJson: null
  });
  entity.set(WorldPosition, { x: position.x, y, z: position.z });
  entity.set(MapFragment, { fragmentId: "world_primary" });
  entity.set(Unit, {
    type: "maintenance_bot",
    archetypeId: "field_technician",
    markLevel: 1,
    speechProfile: "mentor",
    displayName: `${factionsConfig[factionId].displayName} Scout`,
    speed: 3,
    selected: false,
    components: [
      { name: "camera", functional: true, material: "electronic" },
      { name: "legs", functional: true, material: "metal" }
    ]
  });
  entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
  state.scoutCount++;
  state.lastScoutTick = tick;
  recordFactionActivity({
    turn: tick,
    faction: factionId,
    action: "scout",
    position: { x: position.x, z: position.z }
  });
  return true;
}
const _aiFactionIndex = /* @__PURE__ */ new Map();
function initAIFactionEntities() {
  for (const factionId of FACTION_IDS) {
    const existing = _aiFactionIndex.get(factionId);
    if (existing?.isAlive()) continue;
    const e = world.spawn(AIFaction);
    e.set(AIFaction, {
      factionId,
      phase: "dormant",
      ticksUntilDecision: 0
    });
    _aiFactionIndex.set(factionId, e);
  }
}
function getAIFaction(factionId) {
  return _aiFactionIndex.get(factionId)?.get(AIFaction) ?? null;
}
function setAIFactionPhase(factionId, phase) {
  const entity = _aiFactionIndex.get(factionId);
  if (!entity) return;
  const cur = entity.get(AIFaction);
  entity.set(AIFaction, { ...cur, phase });
}
function resetAICivilization() {
  factions.clear();
  constructionEvents = [];
  territoryChangeEvents = [];
  harvestEvents = [];
  for (const entity of _aiFactionIndex.values()) {
    if (entity.isAlive()) entity.destroy();
  }
  _aiFactionIndex.clear();
}

const GOVERNOR_TICK_INTERVAL = 30;
let initialized = false;
function initializeGovernor() {
  initializeAIFactions();
  initialized = true;
}
function governorSystem(tick) {
  if (!initialized) return;
  if (tick % GOVERNOR_TICK_INTERVAL !== 0) return;
  const allFactions = getAllAIFactions();
  for (const [factionId] of allFactions) {
    const config = factionsConfig[factionId];
    evaluateFactionDecision(factionId, config, tick);
  }
}
function evaluateFactionDecision(factionId, config, tick) {
  const state = getAllAIFactions().get(factionId);
  if (!state) return;
  const buildScore = config.buildBias * (1 - state.buildingCount / config.maxBuildings);
  const expandScore = config.expandBias * (1 - state.territoryCells.size / config.maxTerritoryCells);
  const harvestScore = config.harvestBias * (state.resources < 15 ? 1.5 : 0.5);
  const scoutScore = config.scoutBias * (state.scoutCount < 3 ? 1.2 : 0.3);
  const scores = [
    { action: "build", score: buildScore * (0.5 + gameplayRandom()) },
    {
      action: "expand",
      score: expandScore * (0.5 + gameplayRandom())
    },
    {
      action: "harvest",
      score: harvestScore * (0.5 + gameplayRandom())
    },
    { action: "scout", score: scoutScore * (0.5 + gameplayRandom()) }
  ];
  scores.sort((a, b) => b.score - a.score);
  for (const { action } of scores) {
    const succeeded = executeAction(factionId, action, tick);
    if (succeeded) break;
  }
}
function executeAction(factionId, action, tick) {
  const state = getAllAIFactions().get(factionId);
  if (!state) return false;
  switch (action) {
    case "build": {
      const pos = findBuildPosition(factionId);
      if (!pos) return false;
      return aiFactionBuild(factionId, pos, "fabrication_unit", tick);
    }
    case "expand": {
      return aiFactionExpand(factionId, tick);
    }
    case "harvest": {
      const pos = findHarvestPosition(factionId);
      if (!pos) return false;
      return aiFactionHarvest(factionId, pos, tick);
    }
    case "scout": {
      const pos = findScoutPosition(factionId);
      if (!pos) return false;
      return aiFactionDeployScout(factionId, pos, tick);
    }
  }
}
function findBuildPosition(factionId) {
  const state = getAllAIFactions().get(factionId);
  if (!state) return null;
  const cells = Array.from(state.territoryCells);
  for (let attempt = 0; attempt < 5; attempt++) {
    const cellKey = cells[Math.floor(gameplayRandom() * cells.length)];
    const [q, r] = cellKey.split(",").map(Number);
    const worldPos = gridToWorld(q, r);
    if (isPassableAtWorldPosition(worldPos.x, worldPos.z)) {
      return { x: worldPos.x, z: worldPos.z };
    }
  }
  return null;
}
function findHarvestPosition(factionId) {
  const state = getAllAIFactions().get(factionId);
  if (!state) return null;
  const cells = Array.from(state.territoryCells);
  if (cells.length === 0) return null;
  const cellKey = cells[Math.floor(gameplayRandom() * cells.length)];
  const [q, r] = cellKey.split(",").map(Number);
  const worldPos = gridToWorld(q, r);
  return { x: worldPos.x, z: worldPos.z };
}
function findScoutPosition(factionId) {
  const state = getAllAIFactions().get(factionId);
  if (!state) return null;
  const cells = Array.from(state.territoryCells);
  if (cells.length === 0) return null;
  const borderCells = [];
  for (const cellKey2 of cells) {
    const [q2, r2] = cellKey2.split(",").map(Number);
    const neighbors = [
      `${q2 + 1},${r2}`,
      `${q2 - 1},${r2}`,
      `${q2},${r2 + 1}`,
      `${q2},${r2 - 1}`,
      `${q2 + 1},${r2 - 1}`,
      `${q2 - 1},${r2 + 1}`
    ];
    const isBorder = neighbors.some((n) => !state.territoryCells.has(n));
    if (isBorder) {
      borderCells.push(cellKey2);
    }
  }
  if (borderCells.length === 0) return null;
  const cellKey = borderCells[Math.floor(gameplayRandom() * borderCells.length)];
  const [q, r] = cellKey.split(",").map(Number);
  const worldPos = gridToWorld(q, r);
  if (!isPassableAtWorldPosition(worldPos.x, worldPos.z)) return null;
  return { x: worldPos.x, z: worldPos.z };
}
function resetGovernorSystem() {
  initialized = false;
}

const globalCompute = {
  capacity: 0,
  demand: 0,
  available: 0
};
const HACKING_AP_COST = 1;
const HACKING_SIGNAL_RANGE = 3;
function getHackDifficulty(_target) {
  return gameplayConfig.hacking.baseDifficulty;
}
const HACKED_BOT_ROLES = {
  feral_drone: {
    label: "Reclaimed Striker",
    combatStyle: "melee",
    attackRange: 2.5,
    structureDamageMultiplier: 1,
    speedModifier: 1.3
  },
  mecha_trooper: {
    label: "Reclaimed Gunner",
    combatStyle: "ranged",
    attackRange: 5,
    structureDamageMultiplier: 1,
    speedModifier: 1
  },
  quadruped_tank: {
    label: "Reclaimed Siege Engine",
    combatStyle: "siege",
    attackRange: 3,
    structureDamageMultiplier: 2,
    speedModifier: 0.8
  }
};
const DEFAULT_HACKED_ROLE = {
  label: "Reclaimed Unit",
  combatStyle: "melee",
  attackRange: 2.5,
  structureDamageMultiplier: 1,
  speedModifier: 1
};
function getHackedBotRole(unitType) {
  return HACKED_BOT_ROLES[unitType] ?? DEFAULT_HACKED_ROLE;
}
function applyHackedRole(entity) {
  const unit = entity.get(Unit);
  if (!unit) return DEFAULT_HACKED_ROLE;
  const role = getHackedBotRole(unit.type);
  entity.set(Unit, {
    ...unit,
    speed: unit.speed * role.speedModifier
  });
  return role;
}
function canHackerAct(entity) {
  const faction = entity.get(Identity)?.faction;
  if (!faction) return false;
  const turn = getTurnState();
  if (faction === "player") {
    if (turn.phase !== "player") return false;
    const entityId = entity.get(Identity).id;
    return hasActionPoints(entityId);
  }
  return true;
}
function trySpendHackAP(entity) {
  const faction = entity.get(Identity)?.faction;
  if (faction === "player") {
    const entityId = entity.get(Identity).id;
    return spendActionPoint(entityId, HACKING_AP_COST);
  }
  return true;
}
let lastHackingEvents = [];
function getLastHackingEvents() {
  return lastHackingEvents;
}
function resetHackingState() {
  lastHackingEvents = [];
}
function hackingSystem() {
  const hackers = world.query(Hacking, Signal);
  const events = [];
  for (const entity of hackers) {
    const hack = entity.get(Hacking);
    const identity = entity.get(Identity);
    if (!hack.targetId) continue;
    const currentTargetId = hack.targetId;
    const target = world.query(Identity).find((e) => e.get(Identity)?.id === currentTargetId);
    if (!target || target.get(Identity)?.faction === "player" || target.get(Identity)?.faction === "cultist") {
      entity.set(Hacking, { ...hack, targetId: null, progress: 0 });
      if (identity?.id) {
        cancelAgentTask(identity.id);
      }
      continue;
    }
    if (!entity.get(Signal)?.connected) {
      continue;
    }
    if (!canHackerAct(entity)) {
      continue;
    }
    const aiState = readAIState(entity);
    const targetPosition = target.get(WorldPosition);
    const sourcePosition = entity.get(WorldPosition);
    if (!aiState || aiState.task?.kind !== "hack_target" || aiState.task.phase !== "execute" || !targetPosition || !sourcePosition) {
      continue;
    }
    const dx = targetPosition.x - sourcePosition.x;
    const dz = targetPosition.z - sourcePosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > HACKING_SIGNAL_RANGE) {
      continue;
    }
    if (globalCompute.available < hack.computeCostPerTick) {
      continue;
    }
    if (!trySpendHackAP(entity)) {
      continue;
    }
    globalCompute.available -= hack.computeCostPerTick;
    const newProgress = hack.progress + hack.computeCostPerTick / getHackDifficulty(target);
    if (newProgress >= 1) {
      const targetIdentity = target.get(Identity);
      target.set(Identity, {
        ...targetIdentity,
        faction: "player"
      });
      const role = applyHackedRole(target);
      entity.set(Hacking, { ...hack, targetId: null, progress: 0 });
      if (identity?.id) {
        cancelAgentTask(identity.id);
      }
      events.push({
        hackerId: identity?.id ?? "",
        targetId: targetIdentity.id,
        progress: 1,
        completed: true,
        capturedRole: role
      });
    } else {
      entity.set(Hacking, { ...hack, progress: newProgress });
      events.push({
        hackerId: identity?.id ?? "",
        targetId: target.get(Identity).id,
        progress: newProgress,
        completed: false,
        capturedRole: null
      });
    }
  }
  lastHackingEvents = events;
}

const HACK_RANGE = 3;
const CAPTURED_SPEECH_PROFILES = {
  arachnoid: "light_melee",
  mecha_trooper: "ranged",
  quadruped_tank: "siege"
};
function checkHackEligibility(hacker, target) {
  const hackerIdentity = hacker.get(Identity);
  if (!hackerIdentity || hackerIdentity.faction !== "player") {
    return { canHack: false, reason: "Only player units can hack" };
  }
  const targetIdentity = target.get(Identity);
  if (!targetIdentity) {
    return { canHack: false, reason: "Invalid target" };
  }
  if (targetIdentity.faction === "player") {
    return { canHack: false, reason: "Cannot hack friendly units" };
  }
  if (targetIdentity.faction === "cultist") {
    return { canHack: false, reason: "Humans cannot be hacked" };
  }
  const signal = hacker.get(Signal);
  if (!signal?.connected) {
    return {
      canHack: false,
      reason: "No signal link — connect to network first"
    };
  }
  const hackComp = hacker.get(Hacking);
  if (!hackComp) {
    return { canHack: false, reason: "Unit lacks hacking capability" };
  }
  if (hackComp.targetId && hackComp.targetId !== targetIdentity.id) {
    return { canHack: false, reason: "Already hacking another target" };
  }
  if (globalCompute.available < hackComp.computeCostPerTick) {
    return {
      canHack: false,
      reason: `Insufficient compute (need ${hackComp.computeCostPerTick}, have ${globalCompute.available})`
    };
  }
  return { canHack: true, reason: null };
}
function initiateHack(hacker, target) {
  const check = checkHackEligibility(hacker, target);
  if (!check.canHack) return false;
  const hackComp = hacker.get(Hacking);
  const targetIdentity = target.get(Identity);
  if (!hackComp || !targetIdentity) return false;
  hacker.set(Hacking, {
    ...hackComp,
    targetId: targetIdentity.id,
    progress: 0
  });
  return true;
}
let lastHackEvents = [];
function getLastHackEvents() {
  return lastHackEvents;
}
function resetHackingSystemState() {
  lastHackEvents = [];
}
function hackingCaptureSystem() {
  const events = [];
  const hackers = world.query(Hacking, Signal, Identity, WorldPosition);
  for (const entity of hackers) {
    const hack = entity.get(Hacking);
    const identity = entity.get(Identity);
    const signal = entity.get(Signal);
    const hackerPos = entity.get(WorldPosition);
    if (!hack.targetId) continue;
    const currentTargetId = hack.targetId;
    const target = world.query(Identity, WorldPosition).find((e) => e.get(Identity)?.id === currentTargetId);
    if (!target) {
      entity.set(Hacking, {
        ...hack,
        targetId: null,
        progress: 0
      });
      events.push({
        hackerId: identity.id,
        targetId: currentTargetId,
        progress: 0,
        completed: false,
        failed: true,
        failReason: "Target destroyed"
      });
      continue;
    }
    const targetIdentity = target.get(Identity);
    const targetPos = target.get(WorldPosition);
    if (targetIdentity.faction === "player") {
      entity.set(Hacking, {
        ...hack,
        targetId: null,
        progress: 0
      });
      continue;
    }
    if (!signal.connected) {
      entity.set(Hacking, {
        ...hack,
        targetId: null,
        progress: 0
      });
      events.push({
        hackerId: identity.id,
        targetId: currentTargetId,
        progress: 0,
        completed: false,
        failed: true,
        failReason: "Signal link broken"
      });
      continue;
    }
    const dx = hackerPos.x - targetPos.x;
    const dz = hackerPos.z - targetPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > HACK_RANGE) {
      entity.set(Hacking, {
        ...hack,
        targetId: null,
        progress: 0
      });
      events.push({
        hackerId: identity.id,
        targetId: currentTargetId,
        progress: 0,
        completed: false,
        failed: true,
        failReason: "Target out of range"
      });
      continue;
    }
    if (globalCompute.available < hack.computeCostPerTick) {
      events.push({
        hackerId: identity.id,
        targetId: targetIdentity.id,
        progress: hack.progress,
        completed: false,
        failed: false,
        failReason: null
      });
      continue;
    }
    const difficulty = gameplayConfig.hacking.baseDifficulty;
    globalCompute.available -= hack.computeCostPerTick;
    const newProgress = hack.progress + hack.computeCostPerTick / difficulty;
    const COMPLETION_THRESHOLD = 1 - 1e-9;
    if (newProgress >= COMPLETION_THRESHOLD) {
      target.set(Identity, {
        ...targetIdentity,
        faction: "player"
      });
      const targetUnit = target.get(Unit);
      if (targetUnit) {
        const speechProfile = CAPTURED_SPEECH_PROFILES[targetUnit.type] ?? "generic";
        target.set(Unit, {
          ...targetUnit,
          displayName: `${targetUnit.displayName} [${speechProfile}]`
        });
      }
      events.push({
        hackerId: identity.id,
        targetId: targetIdentity.id,
        progress: 1,
        completed: true,
        failed: false,
        failReason: null
      });
      entity.set(Hacking, {
        ...hack,
        targetId: null,
        progress: 0
      });
    } else {
      entity.set(Hacking, {
        ...hack,
        progress: newProgress
      });
      events.push({
        hackerId: identity.id,
        targetId: targetIdentity.id,
        progress: newProgress,
        completed: false,
        failed: false,
        failReason: null
      });
    }
  }
  lastHackEvents = events;
}

let nextId = 1;
const events = [];
const listeners$2 = /* @__PURE__ */ new Set();
const EVENT_LIFETIME_TICKS = 180;
function notify$2() {
  for (const listener of listeners$2) {
    listener();
  }
}
function pushHarvestYield(x, z, yields, tick) {
  const yieldArray = [];
  for (const [resource, amount] of yields) {
    if (amount > 0) {
      yieldArray.push({ resource, amount });
    }
  }
  if (yieldArray.length === 0) return;
  events.push({
    id: nextId++,
    x,
    z,
    yields: yieldArray,
    createdAtTick: tick
  });
  while (events.length > 6) {
    events.shift();
  }
  notify$2();
}
function getHarvestYieldEvents() {
  return events;
}
function subscribeHarvestEvents(listener) {
  listeners$2.add(listener);
  return () => listeners$2.delete(listener);
}
function expireHarvestEvents(currentTick) {
  let removed = false;
  for (let i = events.length - 1; i >= 0; i--) {
    if (currentTick - events[i].createdAtTick > EVENT_LIFETIME_TICKS) {
      events.splice(i, 1);
      removed = true;
    }
  }
  if (removed) {
    notify$2();
  }
}
function resetHarvestEvents() {
  events.length = 0;
  nextId = 1;
}

const HARVEST_RESOURCE_LABELS = {
  heavy_metals: "Heavy Metals",
  light_metals: "Light Metals",
  uranics: "Uranics",
  plastics: "Plastics",
  oil: "Oil",
  microchips: "Microchips",
  scrap: "Scrap",
  rare_components: "Rare Components"
};
const HARVEST_RESOURCE_COLORS = {
  heavy_metals: "#8e9baa",
  light_metals: "#b0c4d8",
  uranics: "#88a7ff",
  plastics: "#e8c86a",
  oil: "#8a6e3a",
  microchips: "#6ff3c8",
  scrap: "#7a7a7a",
  rare_components: "#d4a0ff"
};
const HARVEST_RESOURCE_USES = {
  heavy_metals: "Armor, chassis, defensive structures",
  light_metals: "Electronics, sensors, light components",
  uranics: "Energy systems, power cells",
  plastics: "Wiring, seals, basic components",
  oil: "Lubricants, fuel cells, fabrication",
  microchips: "AI cores, processors, upgrades",
  scrap: "Universal low-quality material",
  rare_components: "Advanced fabrication, Mark upgrades"
};
const WALL_POOL = {
  label: "Structural Wall Section",
  harvestDuration: 120,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 3, max: 5 },
    { resource: "scrap", min: 1, max: 2 }
  ]
};
const COLUMN_POOL = {
  label: "Support Column",
  harvestDuration: 100,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 2, max: 4 },
    { resource: "light_metals", min: 0, max: 1 }
  ]
};
const PROP_CONTAINER_POOL = {
  label: "Storage Container",
  harvestDuration: 60,
  consumedOnHarvest: true,
  yields: [
    { resource: "light_metals", min: 1, max: 2 },
    { resource: "plastics", min: 1, max: 2 },
    { resource: "scrap", min: 0, max: 1 }
  ]
};
const PROP_COMPUTER_POOL = {
  label: "Terminal Equipment",
  harvestDuration: 80,
  consumedOnHarvest: true,
  yields: [
    { resource: "microchips", min: 1, max: 3 },
    { resource: "light_metals", min: 1, max: 1 }
  ]
};
const PROP_VESSEL_POOL = {
  label: "Industrial Vessel",
  harvestDuration: 70,
  consumedOnHarvest: true,
  yields: [
    { resource: "plastics", min: 2, max: 3 },
    { resource: "oil", min: 1, max: 2 }
  ]
};
const PROP_GENERIC_POOL = {
  label: "Salvageable Equipment",
  harvestDuration: 50,
  consumedOnHarvest: true,
  yields: [
    { resource: "scrap", min: 1, max: 3 },
    { resource: "light_metals", min: 0, max: 1 }
  ]
};
const UTILITY_POOL = {
  label: "Utility Infrastructure",
  harvestDuration: 90,
  consumedOnHarvest: true,
  yields: [
    { resource: "plastics", min: 1, max: 3 },
    { resource: "oil", min: 1, max: 1 },
    { resource: "light_metals", min: 0, max: 1 }
  ]
};
const DETAIL_POOL = {
  label: "Surface Detail",
  harvestDuration: 30,
  consumedOnHarvest: true,
  yields: [
    { resource: "light_metals", min: 0, max: 1 },
    { resource: "plastics", min: 0, max: 1 }
  ]
};
const STAIR_POOL = {
  label: "Structural Stairway",
  harvestDuration: 110,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 2, max: 3 },
    { resource: "light_metals", min: 1, max: 1 }
  ]
};
const DOOR_POOL = {
  label: "Bulkhead Door",
  harvestDuration: 80,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 1, max: 2 },
    { resource: "light_metals", min: 1, max: 1 },
    { resource: "microchips", min: 0, max: 1 }
  ]
};
const ROOF_POOL = {
  label: "Roof Panel",
  harvestDuration: 100,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 2, max: 3 },
    { resource: "plastics", min: 1, max: 1 }
  ]
};
const POWER_INFRASTRUCTURE_POOL = {
  label: "Power Infrastructure",
  harvestDuration: 150,
  consumedOnHarvest: true,
  yields: [
    { resource: "uranics", min: 1, max: 3 },
    { resource: "heavy_metals", min: 2, max: 2 },
    { resource: "microchips", min: 0, max: 1 }
  ]
};
const RESEARCH_EQUIPMENT_POOL = {
  label: "Research Equipment",
  harvestDuration: 120,
  consumedOnHarvest: true,
  yields: [
    { resource: "microchips", min: 2, max: 4 },
    { resource: "rare_components", min: 0, max: 2 },
    { resource: "light_metals", min: 1, max: 1 }
  ]
};
const FLOOR_METAL_PANEL_POOL = {
  label: "Metal Panel Floor",
  harvestDuration: 80,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 2, max: 4 },
    { resource: "scrap", min: 1, max: 2 }
  ]
};
const FLOOR_CONCRETE_SLAB_POOL = {
  label: "Concrete Slab Floor",
  harvestDuration: 90,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 1, max: 2 },
    { resource: "scrap", min: 2, max: 3 }
  ]
};
const FLOOR_INDUSTRIAL_GRATING_POOL = {
  label: "Industrial Grating Floor",
  harvestDuration: 70,
  consumedOnHarvest: true,
  yields: [
    { resource: "light_metals", min: 2, max: 3 },
    { resource: "scrap", min: 1, max: 2 }
  ]
};
const FLOOR_RUSTY_PLATING_POOL = {
  label: "Rusty Plating Floor",
  harvestDuration: 60,
  consumedOnHarvest: true,
  yields: [
    { resource: "heavy_metals", min: 1, max: 2 },
    { resource: "scrap", min: 2, max: 4 }
  ]
};
const FLOOR_CORRODED_STEEL_POOL = {
  label: "Corroded Steel Floor",
  harvestDuration: 50,
  consumedOnHarvest: true,
  yields: [
    { resource: "scrap", min: 2, max: 4 },
    { resource: "heavy_metals", min: 0, max: 1 }
  ]
};
const FLOOR_POOLS = {
  metal_panel: FLOOR_METAL_PANEL_POOL,
  concrete_slab: FLOOR_CONCRETE_SLAB_POOL,
  industrial_grating: FLOOR_INDUSTRIAL_GRATING_POOL,
  rusty_plating: FLOOR_RUSTY_PLATING_POOL,
  corroded_steel: FLOOR_CORRODED_STEEL_POOL
};
function getResourcePoolForModel(family, modelId) {
  const id = modelId.toLowerCase();
  if (family === "prop") {
    if (id.includes("computer") || id.includes("laser") || id.includes("teleporter")) {
      return PROP_COMPUTER_POOL;
    }
    if (id.includes("container") || id.includes("crate") || id.includes("chest") || id.includes("shelf")) {
      return PROP_CONTAINER_POOL;
    }
    if (id.includes("vessel") || id.includes("capsule") || id.includes("pod")) {
      return PROP_VESSEL_POOL;
    }
    return PROP_GENERIC_POOL;
  }
  if (id.includes("power") || id.includes("sink") || id.includes("reactor")) {
    return POWER_INFRASTRUCTURE_POOL;
  }
  if (id.includes("archive") || id.includes("research") || id.includes("observatory")) {
    return RESEARCH_EQUIPMENT_POOL;
  }
  switch (family) {
    case "wall":
      return WALL_POOL;
    case "column":
      return COLUMN_POOL;
    case "utility":
      return UTILITY_POOL;
    case "detail":
      return DETAIL_POOL;
    case "stair":
      return STAIR_POOL;
    case "door":
      return DOOR_POOL;
    case "roof":
      return ROOF_POOL;
    default:
      return PROP_GENERIC_POOL;
  }
}
function rollHarvestYield(pool, seed) {
  const yields = /* @__PURE__ */ new Map();
  let state = seed >>> 0;
  for (const entry of pool.yields) {
    state = Math.imul(state ^ 73244475, 73244475) + 1 >>> 0;
    const range = entry.max - entry.min;
    const amount = range > 0 ? entry.min + state % (range + 1) : entry.min;
    if (amount > 0) {
      yields.set(entry.resource, (yields.get(entry.resource) ?? 0) + amount);
    }
  }
  return yields;
}
function isHarvestable(family) {
  return family !== "floor";
}
function isFloorHarvestable(floorMaterial) {
  return floorMaterial in FLOOR_POOLS;
}
function getResourcePoolForFloorMaterial(floorMaterial) {
  const pool = FLOOR_POOLS[floorMaterial];
  return pool ?? FLOOR_METAL_PANEL_POOL;
}

const activeHarvests = [];
const consumedStructureIds = /* @__PURE__ */ new Set();
const consumedFloorTiles = /* @__PURE__ */ new Set();
const _harvestOpIndex = /* @__PURE__ */ new Map();
function spawnHarvestOpEntity(harvesterId, structureId, ticksRemaining, harvestType) {
  const existing = _harvestOpIndex.get(harvesterId);
  if (existing?.isAlive()) existing.destroy();
  const entity = world.spawn(HarvestOp);
  entity.set(HarvestOp, {
    harvesterId,
    structureId,
    ticksRemaining,
    harvestType
  });
  _harvestOpIndex.set(harvesterId, entity);
}
function destroyHarvestOpEntity(harvesterId) {
  const entity = _harvestOpIndex.get(harvesterId);
  if (entity?.isAlive()) entity.destroy();
  _harvestOpIndex.delete(harvesterId);
}
function updateHarvestOpTicks(harvesterId, ticksRemaining) {
  const entity = _harvestOpIndex.get(harvesterId);
  if (!entity?.isAlive()) return;
  const cur = entity.get(HarvestOp);
  if (!cur) return;
  entity.set(HarvestOp, { ...cur, ticksRemaining });
}
function startHarvest(harvesterId, structureId, modelId, modelFamily, targetX, targetZ) {
  if (consumedStructureIds.has(structureId)) return false;
  if (activeHarvests.some((h) => h.structureId === structureId)) return false;
  if (activeHarvests.some((h) => h.harvesterId === harvesterId)) return false;
  if (!isHarvestable(modelFamily)) return false;
  const pool = getResourcePoolForModel(modelFamily, modelId);
  const totalTicks = pool.harvestDuration;
  activeHarvests.push({
    harvesterId,
    structureId,
    modelId,
    modelFamily,
    ticksRemaining: totalTicks,
    totalTicks,
    targetX,
    targetZ
  });
  spawnHarvestOpEntity(harvesterId, structureId, totalTicks, "structure");
  queueThought("harvest_instinct");
  return true;
}
function startFloorHarvest(harvesterId, tileX, tileZ, level, floorMaterial) {
  const key = tileKey3D(tileX, tileZ, level);
  if (consumedFloorTiles.has(key)) return false;
  if (activeHarvests.some(
    (h) => h.isFloorHarvest && h.targetX === tileX && h.targetZ === tileZ && h.level === level
  ))
    return false;
  if (activeHarvests.some((h) => h.harvesterId === harvesterId)) return false;
  if (!isFloorHarvestable(floorMaterial)) return false;
  const pool = getResourcePoolForFloorMaterial(floorMaterial);
  const totalTicks = pool.harvestDuration;
  activeHarvests.push({
    harvesterId,
    isFloorHarvest: true,
    floorMaterial,
    level,
    ticksRemaining: totalTicks,
    totalTicks,
    targetX: tileX,
    targetZ: tileZ
  });
  spawnHarvestOpEntity(harvesterId, 0, totalTicks, "floor");
  queueThought("harvest_instinct");
  return true;
}
function cancelHarvest(harvesterId) {
  const index = activeHarvests.findIndex((h) => h.harvesterId === harvesterId);
  if (index >= 0) {
    activeHarvests.splice(index, 1);
  }
  destroyHarvestOpEntity(harvesterId);
}
function getActiveHarvests() {
  return activeHarvests;
}
function getHarvestExtras(harvesterId) {
  return activeHarvests.find((h) => h.harvesterId === harvesterId);
}
function isStructureConsumed(structureId) {
  return consumedStructureIds.has(structureId);
}
function getConsumedStructureIds() {
  return consumedStructureIds;
}
function isFloorTileConsumed(tileX, tileZ, level) {
  return consumedFloorTiles.has(tileKey3D(tileX, tileZ, level));
}
function getConsumedFloorTiles() {
  return consumedFloorTiles;
}
function resetHarvestSystem() {
  for (const e of Array.from(harvestOps)) {
    if (e.isAlive()) e.destroy();
  }
  _harvestOpIndex.clear();
  activeHarvests.length = 0;
  consumedStructureIds.clear();
  consumedFloorTiles.clear();
}
function rehydrateHarvestState(consumedIds, harvests, consumedFloorKeys = []) {
  consumedStructureIds.clear();
  for (const id of consumedIds) {
    consumedStructureIds.add(id);
  }
  consumedFloorTiles.clear();
  for (const key of consumedFloorKeys) {
    consumedFloorTiles.add(key);
  }
  activeHarvests.length = 0;
  for (const h of harvests) {
    activeHarvests.push(h);
    const harvestType = h.isFloorHarvest ? "floor" : "structure";
    spawnHarvestOpEntity(
      h.harvesterId,
      h.structureId ?? 0,
      h.ticksRemaining,
      harvestType
    );
  }
}
const HARVEST_TO_POOL_KEY = {
  heavy_metals: "ferrousScrap",
  light_metals: "alloyStock",
  uranics: "electrolyte",
  plastics: "polymerSalvage",
  oil: "electrolyte",
  microchips: "siliconWafer",
  scrap: "scrapMetal",
  rare_components: "elCrystal"
};
function harvestSystem(tick) {
  const currentTick = tick ?? 0;
  expireHarvestEvents(currentTick);
  for (let i = activeHarvests.length - 1; i >= 0; i--) {
    const harvest = activeHarvests[i];
    const harvester = Array.from(units).find(
      (u) => u.get(Identity)?.id === harvest.harvesterId
    );
    if (!harvester) {
      activeHarvests.splice(i, 1);
      destroyHarvestOpEntity(harvest.harvesterId);
      continue;
    }
    const pos = harvester.get(WorldPosition);
    if (pos) {
      const dx = pos.x - harvest.targetX;
      const dz = pos.z - harvest.targetZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 3) continue;
    }
    harvest.ticksRemaining--;
    updateHarvestOpTicks(harvest.harvesterId, harvest.ticksRemaining);
    if (harvest.ticksRemaining <= 0) {
      const pool = harvest.isFloorHarvest ? getResourcePoolForFloorMaterial(harvest.floorMaterial) : getResourcePoolForModel(harvest.modelFamily, harvest.modelId);
      const seed = harvest.isFloorHarvest ? harvest.targetX * 31 + harvest.targetZ * 17 + (harvest.level ?? 0) * 7 + harvest.totalTicks : harvest.structureId * 31 + harvest.modelId.length * 17 + harvest.totalTicks;
      const yields = rollHarvestYield(pool, seed);
      for (const [resource, amount] of yields) {
        const poolKey = HARVEST_TO_POOL_KEY[resource];
        if (poolKey) {
          addResource(poolKey, amount);
        }
      }
      pushHarvestYield(harvest.targetX, harvest.targetZ, yields, currentTick);
      if (harvest.isFloorHarvest) {
        consumedFloorTiles.add(
          tileKey3D(harvest.targetX, harvest.targetZ, harvest.level ?? 0)
        );
        const session = getActiveWorldSession();
        if (session) {
          try {
            const db = getDatabaseSync();
            const turnNumber = getTurnState().turnNumber;
            writeTileDelta(db, session.saveGame.id, {
              tileX: harvest.targetX,
              tileZ: harvest.targetZ,
              level: harvest.level ?? 0,
              changeType: "harvested",
              newModelId: null,
              newPassable: true,
              controllerFaction: null,
              resourceRemaining: null,
              turnNumber
            });
            const cx = Math.floor(harvest.targetX / CHUNK_SIZE);
            const cz = Math.floor(harvest.targetZ / CHUNK_SIZE);
            invalidateChunk(cx, cz);
          } catch {
          }
        }
      } else {
        consumedStructureIds.add(harvest.structureId);
      }
      destroyHarvestOpEntity(harvest.harvesterId);
      activeHarvests.splice(i, 1);
    }
  }
}

const chronometer = {"ticksPerGameMinute":4,"gameMinutesPerDay":24,"startingTimeOfDay":0.25,"_comment_ticksPerGameMinute":"At 60 ticks/sec and gameSpeed=1, 4 ticks = 1 game-minute. A full day-night cycle = 24 game-minutes = 96 ticks = ~1.6 real seconds at 1x. At default gameSpeed, a full cycle takes about 24 real minutes.","_comment_startingTimeOfDay":"0.0 = midnight (dimmest), 0.25 = dawn, 0.5 = noon (brightest), 0.75 = dusk. Default starts at dawn."};
const wormholeCycle = {"_comment":"The wormhole IS the sun. Its glow cycle defines day/night.","minGlowIntensity":0.15,"maxGlowIntensity":1,"glowColor":{"day":[0.35,0.1,0.55],"night":[0.08,0.02,0.12]},"ambientLight":{"dayIntensity":0.45,"nightIntensity":0.08,"dayColor":[0.08,0.06,0.14],"nightColor":[0.02,0.01,0.04]},"directionalLight":{"dayIntensity":0.7,"nightIntensity":0.1,"color":[0.47,0.27,0.67]},"surgeTint":{"color":[0.1,0.05,0.14],"threshold":0.6,"blendStrength":0.3}};
const stormProfiles = {"stable":{"rainParticleCount":800,"rainAlphaBase":0.12,"rainAlphaStorm":0.18,"windSpeedBase":2,"windSpeedStorm":4,"cloudSpeed":0.04,"cloudDetailScale":6,"lightningIntervalMin":15,"lightningIntervalMax":25,"rodCaptureChance":0.1,"debrisThreshold":999,"fogDensity":0.3,"skyTintShift":0,"colorGrade":{"darkCloud":[0.01,0.015,0.03],"lightCloud":[0.06,0.06,0.12]}},"volatile":{"rainParticleCount":1400,"rainAlphaBase":0.15,"rainAlphaStorm":0.25,"windSpeedBase":3,"windSpeedStorm":6,"cloudSpeed":0.08,"cloudDetailScale":8,"lightningIntervalMin":5,"lightningIntervalMax":12,"rodCaptureChance":0.3,"debrisThreshold":0.9,"fogDensity":0.5,"skyTintShift":0.3,"colorGrade":{"darkCloud":[0.02,0.012,0.028],"lightCloud":[0.1,0.06,0.11]}},"cataclysmic":{"rainParticleCount":2000,"rainAlphaBase":0.2,"rainAlphaStorm":0.35,"windSpeedBase":5,"windSpeedStorm":9,"cloudSpeed":0.14,"cloudDetailScale":10,"lightningIntervalMin":3,"lightningIntervalMax":6,"rodCaptureChance":0.6,"debrisThreshold":0.82,"fogDensity":0.8,"skyTintShift":0.7,"colorGrade":{"darkCloud":[0.04,0.01,0.03],"lightCloud":[0.14,0.06,0.1]}}};
const lightning = {"boltSegments":10,"branchChance":0.3,"branchSegments":4,"skyHeight":45,"displacement":4,"strikeDuration":0.18,"afterglowDuration":0.08,"maxActiveBolts":4,"ambientMinDist":30,"ambientMaxDist":70,"rodSurgeThreshold":0.85,"rodCaptureCooldown":4,"colors":{"ambient":[0.5,0.6,1],"rodCapture":[0.96,0.77,0.42],"flash":[0.6,0.65,0.95]},"flashIntensity":{"ambient":3.5,"rodCapture":5},"flashDistance":{"ambient":50,"rodCapture":30},"rodCaptureBranchMultiplier":1.5};
const visibility = {"_comment":"How weather affects gameplay visibility (fog of war sight range multiplier)","clearMultiplier":1,"lightRainMultiplier":0.9,"heavyRainMultiplier":0.7,"surgeMultiplier":0.5,"nightPenalty":0.6,"_comment2":"Final multiplier = weather * (isNight ? nightPenalty : 1.0)"};
const gameplay = {"_comment":"Storm intensity affects unit behavior and power generation","powerGenerationMultiplier":{"_comment":"Lightning rod output = rodCapacity * stormIntensity * dayNightMultiplier","dayMultiplier":1,"nightMultiplier":0.6},"cultistActivityMultiplier":{"_comment":"Cultists are more active during wormhole-night (they worship in darkness)","dayMultiplier":0.7,"nightMultiplier":1.3},"repairSpeedMultiplier":{"_comment":"Heavy rain slows outdoor repair work","clearMultiplier":1,"stormMultiplier":0.7}};
const weatherConfig = {
  chronometer,
  wormholeCycle,
  stormProfiles,
  lightning,
  visibility,
  gameplay,
};

let gameMinutesElapsed = 0;
let lastProcessedTick = 0;
let timeOfDay = weatherConfig.chronometer.startingTimeOfDay;
let dayNumber = 1;
let weatherSnapshot = buildDefaultSnapshot();
function getPhase(t) {
  if (t >= 0.15 && t < 0.3) return "dawn";
  if (t >= 0.3 && t < 0.7) return "day";
  if (t >= 0.7 && t < 0.85) return "dusk";
  return "night";
}
function computeWormholeGlow(t) {
  const raw = 0.5 + 0.5 * Math.sin((t - 0.25) * Math.PI * 2);
  const { minGlowIntensity, maxGlowIntensity } = weatherConfig.wormholeCycle;
  return minGlowIntensity + raw * (maxGlowIntensity - minGlowIntensity);
}
function lerpValue(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor3(a, b, t) {
  return [
    lerpValue(a[0], b[0], t),
    lerpValue(a[1], b[1], t),
    lerpValue(a[2], b[2], t)
  ];
}
function getStormVisuals() {
  const session = getActiveWorldSession();
  const profileKey = session?.config?.stormProfile ?? "volatile";
  const profile = weatherConfig.stormProfiles[profileKey] ?? weatherConfig.stormProfiles.volatile;
  return {
    rainParticleCount: profile.rainParticleCount,
    rainAlphaBase: profile.rainAlphaBase,
    rainAlphaStorm: profile.rainAlphaStorm,
    windSpeedBase: profile.windSpeedBase,
    windSpeedStorm: profile.windSpeedStorm,
    cloudSpeed: profile.cloudSpeed,
    cloudDetailScale: profile.cloudDetailScale,
    lightningIntervalMin: profile.lightningIntervalMin,
    lightningIntervalMax: profile.lightningIntervalMax,
    rodCaptureChance: profile.rodCaptureChance,
    debrisThreshold: profile.debrisThreshold,
    fogDensity: profile.fogDensity,
    skyTintShift: profile.skyTintShift,
    colorGrade: {
      darkCloud: profile.colorGrade.darkCloud,
      lightCloud: profile.colorGrade.lightCloud
    }
  };
}
function computeVisibility(stormIntensity, wormholeGlow) {
  const vis = weatherConfig.visibility;
  let weatherMult;
  if (stormIntensity < 0.4) {
    weatherMult = lerpValue(
      vis.clearMultiplier,
      vis.lightRainMultiplier,
      stormIntensity / 0.4
    );
  } else if (stormIntensity < 0.8) {
    weatherMult = lerpValue(
      vis.lightRainMultiplier,
      vis.heavyRainMultiplier,
      (stormIntensity - 0.4) / 0.4
    );
  } else {
    weatherMult = lerpValue(
      vis.heavyRainMultiplier,
      vis.surgeMultiplier,
      (stormIntensity - 0.8) / 0.2
    );
  }
  const nightFactor = lerpValue(vis.nightPenalty, 1, wormholeGlow);
  return weatherMult * nightFactor;
}
function buildSnapshot$1(stormIntensity = 0.7) {
  const glow = computeWormholeGlow(timeOfDay);
  const phase = getPhase(timeOfDay);
  const wc = weatherConfig.wormholeCycle;
  const gp = weatherConfig.gameplay;
  const ambientIntensity = lerpValue(
    wc.ambientLight.nightIntensity,
    wc.ambientLight.dayIntensity,
    glow
  );
  const ambientColor = lerpColor3(
    wc.ambientLight.nightColor,
    wc.ambientLight.dayColor,
    glow
  );
  const stormAmbientBoost = stormIntensity * 0.15;
  const directionalIntensity = lerpValue(
    wc.directionalLight.nightIntensity,
    wc.directionalLight.dayIntensity,
    glow
  );
  const directionalColor = wc.directionalLight.color;
  const visibilityMultiplier = computeVisibility(stormIntensity, glow);
  const powerMultiplier = lerpValue(
    gp.powerGenerationMultiplier.nightMultiplier,
    gp.powerGenerationMultiplier.dayMultiplier,
    glow
  );
  const cultistActivityMultiplier = lerpValue(
    gp.cultistActivityMultiplier.nightMultiplier,
    gp.cultistActivityMultiplier.dayMultiplier,
    glow
  );
  const repairSpeedMultiplier = lerpValue(
    gp.repairSpeedMultiplier.stormMultiplier,
    gp.repairSpeedMultiplier.clearMultiplier,
    1 - stormIntensity
  );
  return {
    timeOfDay,
    phase,
    dayNumber,
    gameMinutesElapsed,
    wormholeGlow: glow,
    ambientIntensity: ambientIntensity + stormAmbientBoost,
    ambientColor,
    directionalIntensity,
    directionalColor,
    visibilityMultiplier,
    powerMultiplier,
    cultistActivityMultiplier,
    repairSpeedMultiplier,
    stormVisuals: getStormVisuals()
  };
}
function buildDefaultSnapshot() {
  return buildSnapshot$1(0.7);
}
function getWeatherSnapshot() {
  return weatherSnapshot;
}
function getTimeOfDay() {
  return timeOfDay;
}
function getDayNumber() {
  return dayNumber;
}
function getWormholeGlow() {
  return weatherSnapshot.wormholeGlow;
}
function getTimeDisplayString() {
  const phaseLabels = {
    night: "NIGHT",
    dawn: "DAWN",
    day: "DAY",
    dusk: "DUSK"
  };
  return `Day ${dayNumber} — ${phaseLabels[weatherSnapshot.phase]}`;
}
function resetWeatherSystem() {
  gameMinutesElapsed = 0;
  lastProcessedTick = 0;
  timeOfDay = weatherConfig.chronometer.startingTimeOfDay;
  dayNumber = 1;
  weatherSnapshot = buildDefaultSnapshot();
}
function weatherSystem(tick, gameSpeed, stormIntensity) {
  const { ticksPerGameMinute, gameMinutesPerDay } = weatherConfig.chronometer;
  const tickDelta = tick - lastProcessedTick;
  lastProcessedTick = tick;
  const minutesThisTick = gameSpeed * tickDelta / ticksPerGameMinute;
  gameMinutesElapsed += minutesThisTick;
  const totalMinutesInDay = gameMinutesPerDay;
  const minuteInCurrentDay = gameMinutesElapsed % totalMinutesInDay;
  timeOfDay = minuteInCurrentDay / totalMinutesInDay;
  dayNumber = Math.floor(gameMinutesElapsed / totalMinutesInDay) + 1;
  weatherSnapshot = buildSnapshot$1(stormIntensity);
}

const cfg = weatherConfig.lightning;
function generateBoltPath(startX, startY, startZ, endX, endY, endZ, segments, displacement) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t,
      z: startZ + (endZ - startZ) * t
    });
  }
  const dx = endX - startX;
  const dy = endY - startY;
  const dz = endZ - startZ;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dirX = dx / len;
  const dirZ = dz / len;
  const perpX = -dirZ;
  const perpZ = dirX;
  for (let i = 1; i < points.length - 1; i++) {
    const lateralOffset = (gameplayRandom() - 0.5) * 2 * displacement;
    const forwardJitter = (gameplayRandom() - 0.5) * displacement * 0.3;
    points[i].x += perpX * lateralOffset + dirX * forwardJitter;
    points[i].z += perpZ * lateralOffset + dirZ * forwardJitter;
  }
  return points;
}
function generateBranches(mainPath, branchChance) {
  const branches = [];
  for (let i = 2; i < mainPath.length - 2; i++) {
    if (gameplayRandom() > branchChance) continue;
    const origin = mainPath[i];
    const bx = origin.x + (gameplayRandom() - 0.5) * 8;
    const by = origin.y - gameplayRandom() * 6;
    const bz = origin.z + (gameplayRandom() - 0.5) * 8;
    branches.push(
      generateBoltPath(
        origin.x,
        origin.y,
        origin.z,
        bx,
        by,
        bz,
        cfg.branchSegments,
        cfg.displacement * 0.4
      )
    );
  }
  return branches;
}
function createBolt(targetX, targetZ, tick, isRodCapture, targetY = 0) {
  const startX = targetX + (gameplayRandom() - 0.5) * 6;
  const startZ = targetZ + (gameplayRandom() - 0.5) * 6;
  const points = generateBoltPath(
    startX,
    cfg.skyHeight,
    startZ,
    targetX,
    targetY,
    targetZ,
    cfg.boltSegments,
    cfg.displacement
  );
  const branchMult = isRodCapture ? cfg.rodCaptureBranchMultiplier : 1;
  const branches = generateBranches(points, cfg.branchChance * branchMult);
  return {
    points,
    branches,
    strikeX: targetX,
    strikeY: targetY,
    strikeZ: targetZ,
    spawnTick: tick,
    isRodCapture
  };
}
let activeBolts = [];
let currentSimTick = 0;
let nextAmbientTick = 0;
let lastRodCaptureTick = 0;
let cameraX = 0;
let cameraZ = 0;
const TICKS_PER_SECOND = 60;
function durationToTicks(seconds) {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}
const totalDurationTicks = durationToTicks(
  cfg.strikeDuration + cfg.afterglowDuration
);
function scheduleNextAmbient(tick) {
  const weather = getWeatherSnapshot();
  const minTicks = durationToTicks(weather.stormVisuals.lightningIntervalMin);
  const maxTicks = durationToTicks(weather.stormVisuals.lightningIntervalMax);
  return tick + minTicks + Math.floor(gameplayRandom() * (maxTicks - minTicks));
}
function getLightningState() {
  return {
    activeBolts,
    currentTick: currentSimTick,
    strikeDuration: cfg.strikeDuration,
    afterglowDuration: cfg.afterglowDuration,
    colors: {
      ambient: cfg.colors.ambient,
      rodCapture: cfg.colors.rodCapture,
      flash: cfg.colors.flash
    },
    flashIntensity: cfg.flashIntensity,
    flashDistance: cfg.flashDistance
  };
}
function setLightningCameraPosition(x, z) {
  cameraX = x;
  cameraZ = z;
}
function resetLightningSystem() {
  activeBolts = [];
  currentSimTick = 0;
  nextAmbientTick = 0;
  lastRodCaptureTick = 0;
  cameraX = 0;
  cameraZ = 0;
}
function lightningSystem(tick, stormIntensity) {
  currentSimTick = tick;
  if (nextAmbientTick === 0) {
    nextAmbientTick = tick + TICKS_PER_SECOND * 2 + Math.floor(gameplayRandom() * TICKS_PER_SECOND * 3);
  }
  activeBolts = activeBolts.filter(
    (b) => tick - b.spawnTick < totalDurationTicks
  );
  if (tick >= nextAmbientTick && activeBolts.length < cfg.maxActiveBolts) {
    const angle = gameplayRandom() * Math.PI * 2;
    const dist = cfg.ambientMinDist + gameplayRandom() * (cfg.ambientMaxDist - cfg.ambientMinDist);
    const targetX = cameraX + Math.cos(angle) * dist;
    const targetZ = cameraZ + Math.sin(angle) * dist;
    activeBolts.push(createBolt(targetX, targetZ, tick, false));
    nextAmbientTick = scheduleNextAmbient(tick);
  }
  const weather = getWeatherSnapshot();
  const rodCooldownTicks = durationToTicks(cfg.rodCaptureCooldown);
  if (stormIntensity > cfg.rodSurgeThreshold && tick - lastRodCaptureTick > rodCooldownTicks && activeBolts.length < cfg.maxActiveBolts && gameplayRandom() < weather.stormVisuals.rodCaptureChance) {
    const rods = Array.from(lightningRods);
    if (rods.length > 0) {
      const rod = rods[Math.floor(gameplayRandom() * rods.length)];
      const wp = rod.get(WorldPosition);
      if (wp) {
        activeBolts.push(createBolt(wp.x, wp.z, tick, true, wp.y + 2));
        lastRodCaptureTick = tick;
      }
    }
  }
}

const markLevels = {"max":5,"costs":{"2":{"scrapMetal":6,"eWaste":3,"intactComponents":1},"3":{"scrapMetal":12,"eWaste":6,"intactComponents":2},"4":{"scrapMetal":20,"eWaste":10,"intactComponents":4},"5":{"scrapMetal":30,"eWaste":15,"intactComponents":6}},"upgradeTicks":{"2":60,"3":120,"4":180,"5":300}};
const motorPoolTiers = {"basic":{"displayName":"Motor Pool (Basic)","maxMark":2},"advanced":{"displayName":"Motor Pool (Advanced)","maxMark":3},"elite":{"displayName":"Motor Pool (Elite)","maxMark":5}};
const adjacencyRange = 3;
const upgradesConfig = {
  markLevels,
  motorPoolTiers,
  adjacencyRange,
};

const MOTOR_POOL_TIER_CONFIG = {
  basic: { maxQueue: 1, maxMark: 1, speedMultiplier: 1 },
  advanced: { maxQueue: 2, maxMark: 2, speedMultiplier: 1.25 },
  elite: { maxQueue: 3, maxMark: 3, speedMultiplier: 1.5 }
};
const MOTOR_POOL_UPGRADE_COSTS = {
  basic: null,
  advanced: [
    { type: "ferrousScrap", amount: 20 },
    { type: "alloyStock", amount: 10 },
    { type: "siliconWafer", amount: 6 }
  ],
  elite: [
    { type: "ferrousScrap", amount: 30 },
    { type: "alloyStock", amount: 15 },
    { type: "siliconWafer", amount: 10 },
    { type: "conductorWire", amount: 8 }
  ]
};
const BOT_FABRICATION_RECIPES = [
  {
    botType: "maintenance_bot",
    label: "Field Technician",
    costs: [
      { type: "ferrousScrap", amount: 6 },
      { type: "alloyStock", amount: 4 },
      { type: "conductorWire", amount: 2 }
    ],
    buildTurns: 3
  },
  {
    botType: "utility_drone",
    label: "Relay Hauler",
    costs: [
      { type: "alloyStock", amount: 6 },
      { type: "conductorWire", amount: 4 },
      { type: "polymerSalvage", amount: 2 }
    ],
    buildTurns: 3
  },
  {
    botType: "mecha_scout",
    label: "Survey Strider",
    costs: [
      { type: "ferrousScrap", amount: 8 },
      { type: "alloyStock", amount: 6 },
      { type: "siliconWafer", amount: 3 }
    ],
    buildTurns: 4
  },
  {
    botType: "field_fighter",
    label: "Assault Strider",
    costs: [
      { type: "ferrousScrap", amount: 12 },
      { type: "alloyStock", amount: 6 },
      { type: "conductorWire", amount: 4 }
    ],
    buildTurns: 5
  },
  {
    botType: "mecha_trooper",
    label: "Storm Trooper",
    costs: [
      { type: "ferrousScrap", amount: 14 },
      { type: "alloyStock", amount: 8 },
      { type: "conductorWire", amount: 4 },
      { type: "electrolyte", amount: 3 }
    ],
    buildTurns: 6
  },
  {
    botType: "mecha_golem",
    label: "Substation Engineer",
    costs: [
      { type: "ferrousScrap", amount: 16 },
      { type: "alloyStock", amount: 10 },
      { type: "siliconWafer", amount: 6 },
      { type: "conductorWire", amount: 4 }
    ],
    buildTurns: 7
  },
  {
    botType: "quadruped_tank",
    label: "Defense Sentry",
    costs: [
      { type: "ferrousScrap", amount: 18 },
      { type: "alloyStock", amount: 10 },
      { type: "conductorWire", amount: 6 },
      { type: "electrolyte", amount: 4 }
    ],
    buildTurns: 8
  }
];
const motorPools = /* @__PURE__ */ new Map();
function getMotorPoolState(entityId) {
  return motorPools.get(entityId) ?? null;
}
function getAllMotorPools() {
  return Array.from(motorPools.values());
}
function registerMotorPool(entityId, tier = "basic") {
  if (motorPools.has(entityId)) return;
  motorPools.set(entityId, {
    motorPoolEntityId: entityId,
    tier,
    queue: []
  });
}
function queueBotFabrication(motorPoolEntityId, botType) {
  const state = motorPools.get(motorPoolEntityId);
  if (!state) return false;
  const tierConfig = MOTOR_POOL_TIER_CONFIG[state.tier];
  if (state.queue.length >= tierConfig.maxQueue) return false;
  const recipe = BOT_FABRICATION_RECIPES.find((r) => r.botType === botType);
  if (!recipe) return false;
  const pool = getResources();
  for (const cost of recipe.costs) {
    if ((pool[cost.type] ?? 0) < cost.amount) return false;
  }
  for (const cost of recipe.costs) {
    spendResource(cost.type, cost.amount);
  }
  state.queue.push({
    botType,
    turnsRemaining: recipe.buildTurns
  });
  return true;
}
function upgradeMotorPool(motorPoolEntityId) {
  const state = motorPools.get(motorPoolEntityId);
  if (!state) return false;
  const nextTier = state.tier === "basic" ? "advanced" : state.tier === "advanced" ? "elite" : null;
  if (!nextTier) return false;
  const costs = MOTOR_POOL_UPGRADE_COSTS[nextTier];
  if (!costs) return false;
  const pool = getResources();
  for (const cost of costs) {
    if ((pool[cost.type] ?? 0) < cost.amount) return false;
  }
  for (const cost of costs) {
    spendResource(cost.type, cost.amount);
  }
  state.tier = nextTier;
  return true;
}
function motorPoolTurnTick() {
  for (const state of motorPools.values()) {
    if (state.queue.length === 0) continue;
    let powered = false;
    let position = null;
    let fragmentId = null;
    for (const bldg of buildings) {
      if (bldg.get(Identity)?.id === state.motorPoolEntityId) {
        const bComp = bldg.get(Building);
        if (bComp?.powered && bComp.operational) {
          powered = true;
          const pos = bldg.get(WorldPosition);
          if (pos) position = { x: pos.x, z: pos.z };
          fragmentId = bldg.get(MapFragment)?.fragmentId ?? null;
        }
        break;
      }
    }
    if (!powered || !position || !fragmentId) continue;
    const job = state.queue[0];
    if (!job) continue;
    job.turnsRemaining--;
    if (job.turnsRemaining <= 0) {
      const _def = getBotDefinition(job.botType);
      spawnUnit({
        x: position.x + 2,
        z: position.z + 2,
        fragmentId,
        type: job.botType,
        components: [
          { name: "camera", functional: true, material: "electronic" },
          { name: "arms", functional: true, material: "metal" },
          { name: "legs", functional: true, material: "metal" },
          { name: "power_cell", functional: true, material: "electronic" }
        ]
      });
      state.queue.shift();
    }
  }
}
function getMarkUpgradeCost(currentMark) {
  const toMark = currentMark + 1;
  const raw = upgradesConfig.markLevels.costs[String(toMark)];
  if (!raw || typeof raw !== "object") return null;
  const costs = [];
  for (const [type, amount] of Object.entries(raw)) {
    if (typeof amount === "number" && amount > 0) {
      costs.push({ type, amount });
    }
  }
  if (costs.length === 0) return null;
  return { fromMark: currentMark, toMark, costs };
}
function canMotorPoolUpgradeMark(motorPoolEntityId, targetMark) {
  const state = motorPools.get(motorPoolEntityId);
  if (!state) return false;
  const tierMaxMark = getMaxMarkForTier(state.tier);
  return targetMark <= tierMaxMark;
}
function resetMotorPoolState() {
  motorPools.clear();
  activeUpgradeJobs.length = 0;
}
function _reset() {
  motorPools.clear();
  activeUpgradeJobs.length = 0;
}
const activeUpgradeJobs = [];
function getActiveUpgradeJobs() {
  return [...activeUpgradeJobs];
}
function getMaxMarkForTier(tier) {
  const tierConfig = upgradesConfig.motorPoolTiers[tier];
  if (!tierConfig) {
    throw new Error(`Unknown Motor Pool tier: ${tier}`);
  }
  return tierConfig.maxMark;
}
function getUpgradeCost(targetMark) {
  const costs = upgradesConfig.markLevels.costs[String(targetMark)];
  return costs ?? null;
}
function getUpgradeTicks(targetMark) {
  const ticks = upgradesConfig.markLevels.upgradeTicks[String(targetMark)];
  if (ticks === void 0) {
    throw new Error(`No upgrade duration for Mark ${targetMark}`);
  }
  return ticks;
}
function findAdjacentMotorPools(unitEntity) {
  const unitPos = unitEntity.get(WorldPosition);
  if (!unitPos) return [];
  const range = upgradesConfig.adjacencyRange;
  const result = [];
  for (const building of buildings) {
    const bComp = building.get(Building);
    if (!bComp || bComp.type !== "motor_pool") continue;
    if (!bComp.powered || !bComp.operational) continue;
    const bPos = building.get(WorldPosition);
    if (!bPos) continue;
    const dx = unitPos.x - bPos.x;
    const dz = unitPos.z - bPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= range) {
      result.push(building);
    }
  }
  return result;
}
function checkUpgradeEligibility(unitEntity, motorPoolEntity) {
  const unit = unitEntity.get(Unit);
  if (!unit) {
    return {
      canUpgrade: false,
      reason: "Not a unit",
      targetMark: 0,
      cost: null
    };
  }
  const currentMark = unit.markLevel;
  const maxMark = upgradesConfig.markLevels.max;
  if (currentMark >= maxMark) {
    return {
      canUpgrade: false,
      reason: "Already at maximum Mark",
      targetMark: currentMark,
      cost: null
    };
  }
  const targetMark = currentMark + 1;
  const motorPoolId = motorPoolEntity.get(Identity)?.id;
  if (!motorPoolId) {
    return {
      canUpgrade: false,
      reason: "Not a Motor Pool",
      targetMark,
      cost: null
    };
  }
  const poolState = motorPools.get(motorPoolId);
  if (!poolState) {
    return {
      canUpgrade: false,
      reason: "Motor Pool not registered",
      targetMark,
      cost: null
    };
  }
  const tierMaxMark = getMaxMarkForTier(poolState.tier);
  if (targetMark > tierMaxMark) {
    return {
      canUpgrade: false,
      reason: `Motor Pool tier too low (${poolState.tier} supports up to Mark ${tierMaxMark})`,
      targetMark,
      cost: null
    };
  }
  const unitId = unitEntity.get(Identity)?.id;
  if (unitId && activeUpgradeJobs.some((job) => job.unitId === unitId)) {
    return {
      canUpgrade: false,
      reason: "Upgrade already in progress",
      targetMark,
      cost: null
    };
  }
  const cost = getUpgradeCost(targetMark);
  if (!cost) {
    return {
      canUpgrade: false,
      reason: `No upgrade cost defined for Mark ${targetMark}`,
      targetMark,
      cost: null
    };
  }
  const pool = getResources();
  for (const [resourceType, amount] of Object.entries(cost)) {
    const available = pool[resourceType] ?? 0;
    if (available < amount) {
      return {
        canUpgrade: false,
        reason: `Insufficient resources (need ${amount} ${resourceType})`,
        targetMark,
        cost
      };
    }
  }
  return { canUpgrade: true, reason: null, targetMark, cost };
}
function startUpgrade(unitEntity, motorPoolEntity) {
  const check = checkUpgradeEligibility(unitEntity, motorPoolEntity);
  if (!check.canUpgrade || !check.cost) return false;
  const unitId = unitEntity.get(Identity)?.id;
  const motorPoolId = motorPoolEntity.get(Identity)?.id;
  if (!unitId || !motorPoolId) return false;
  for (const [resourceType, amount] of Object.entries(check.cost)) {
    if (!spendResource(resourceType, amount)) {
      return false;
    }
  }
  const ticks = getUpgradeTicks(check.targetMark);
  activeUpgradeJobs.push({
    unitId,
    motorPoolId,
    targetMark: check.targetMark,
    ticksRemaining: ticks
  });
  return true;
}
function motorPoolUpgradeSystem() {
  for (let i = activeUpgradeJobs.length - 1; i >= 0; i--) {
    const job = activeUpgradeJobs[i];
    let motorPoolPowered = false;
    for (const building of buildings) {
      if (building.get(Identity)?.id === job.motorPoolId && building.get(Building)?.powered) {
        motorPoolPowered = true;
        break;
      }
    }
    if (!motorPoolPowered) continue;
    let unitEntity = null;
    for (const unit of world.query(Unit, Identity)) {
      if (unit.get(Identity)?.id === job.unitId) {
        unitEntity = unit;
        break;
      }
    }
    if (!unitEntity) {
      activeUpgradeJobs.splice(i, 1);
      continue;
    }
    job.ticksRemaining--;
    if (job.ticksRemaining <= 0) {
      const unit = unitEntity.get(Unit);
      if (unit) {
        unitEntity.set(Unit, {
          ...unit,
          markLevel: job.targetMark
        });
      }
      activeUpgradeJobs.splice(i, 1);
    }
  }
}

function getZoneMovementCost(q, r) {
  const cell = getSectorCell(q, r);
  if (!cell) return movementConfig.defaultCost;
  const costs = movementConfig.zoneCosts;
  return costs[cell.floor_preset_id] ?? movementConfig.defaultCost;
}
function movementSystem(delta, gameSpeed) {
  for (const entity of movingUnits) {
    if (entity.get(AIController)?.enabled) {
      continue;
    }
    const nav = entity.get(Navigation);
    if (!nav.moving || nav.pathIndex >= nav.path.length) {
      nav.moving = false;
      continue;
    }
    const entityId = entity.get(Identity)?.id;
    const faction = entity.get(Identity)?.faction;
    if (faction === "player" && entityId && !hasMovementPoints(entityId)) {
      nav.moving = false;
      continue;
    }
    const targetGridPosition = nav.path[nav.pathIndex];
    const targetWorld = gridToWorld(targetGridPosition.q, targetGridPosition.r);
    const wp = entity.get(WorldPosition);
    const step = entity.get(Unit).speed * delta * gameSpeed;
    const dx = targetWorld.x - wp.x;
    const dz = targetWorld.z - wp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const rot = entity.get(Rotation);
    if (rot && dist > 0.01) {
      rot.y = Math.atan2(dx, dz);
    }
    if (dist <= step) {
      if (faction === "player" && entityId) {
        const mpCost = getZoneMovementCost(
          targetGridPosition.q,
          targetGridPosition.r
        );
        if (!spendMovementPoints(entityId, mpCost)) {
          nav.moving = false;
          continue;
        }
        logTurnEvent("movement", entityId, "player", {
          fromX: wp.x,
          fromZ: wp.z,
          toQ: targetGridPosition.q,
          toR: targetGridPosition.r,
          mpSpent: mpCost
        });
      }
      wp.x = targetWorld.x;
      wp.z = targetWorld.z;
      wp.y = targetWorld.y;
      nav.pathIndex++;
      if (nav.pathIndex >= nav.path.length) {
        nav.moving = false;
      }
    } else {
      wp.x += dx / dist * step;
      wp.z += dz / dist * step;
      wp.y = targetWorld.y;
    }
  }
}

const _comment = "Visual parameters for the three infrastructure overlay types: signal relay, power feed, and embedded conduit route. All tunables here — renderers and systems read from this config.";
const signal = {"_comment":"Thin emissive lines for information transmission between relays","thickness":0.06,"pulseSpeed":2,"pulseLength":0.15,"pulseGap":0.35,"emissiveIntensity":1.8,"yOffset":-0.02,"bezierControlOffset":0.15,"factionColors":{"player":[0.537,0.851,1],"cultist":[1,0.561,0.561],"rogue":[0.6,0.6,0.6],"feral":[0.4,0.4,0.4],"neutral":[0.4,0.4,0.4]},"_comment_factionColors":"RGB [0-1] — player=#89d9ff, cultist=#ff8f8f, rogue=gray, feral=dim gray"};
const power = {"_comment":"Medium emissive lines for power distribution from lightning rods","thickness":0.1,"glowIntensityMin":0.6,"glowIntensityMax":2.5,"emissiveIntensity":2,"yOffset":-0.02,"bezierControlOffset":0.15,"color":[0.965,0.773,0.416],"unpoweredColor":[0.3,0.25,0.15],"_comment_color":"Amber #f6c56a for active power, dim amber for unpowered"};
const conduit = {"_comment":"Embedded conduit route for physical goods transport beneath the sector surface","thickness":0.16,"dashLength":0.3,"gapLength":0.12,"animationSpeed":1.5,"emissiveIntensity":1.4,"yOffset":-0.02,"bezierControlOffset":0.15,"factionColors":{"player":[0.435,0.953,0.784],"cultist":[0.878,0.376,0.251],"rogue":[0.5,0.5,0.5],"feral":[0.35,0.35,0.35],"neutral":[0.35,0.35,0.35]},"_comment_factionColors":"RGB [0-1] — player=#6ff3c8 (mint), cultist=#e06040"};
const junction = {"_comment":"Emissive circle at multi-network intersection points","radius":0.14,"pulseSpeed":1.2,"pulseMin":0.8,"pulseMax":1.6,"emissiveIntensity":2.2,"dimWhenStructure":0.3,"_comment_dimWhenStructure":"Junction brightness multiplier when a structure occupies the same tile"};
const parallelOffset = 0.12;
const maxParallelPerEdge = 3;
const colorTransitionDuration = 2;
const _comment_parallelOffset = "World units perpendicular offset when multiple networks share a hex edge. Max 3 parallel networks per edge.";
const _comment_colorTransitionDuration = "Seconds for network color to transition when territory changes faction";
const networksConfig = {
  _comment,
  signal,
  power,
  conduit,
  junction,
  parallelOffset,
  maxParallelPerEdge,
  colorTransitionDuration,
  _comment_parallelOffset,
  _comment_colorTransitionDuration,
};

let overlayState = {
  segments: [],
  junctions: [],
  currentTick: 0
};
let nextSegmentId = 0;
function edgeKey(q1, r1, q2, r2) {
  if (q1 < q2 || q1 === q2 && r1 < r2) {
    return `${q1},${r1}-${q2},${r2}`;
  }
  return `${q2},${r2}-${q1},${r1}`;
}
function hexKey(q, r) {
  return `${q},${r}`;
}
function getHexNeighborOffsets() {
  return [
    { dq: 1, dr: 0 },
    { dq: -1, dr: 0 },
    { dq: 0, dr: 1 },
    { dq: 0, dr: -1 },
    { dq: 1, dr: -1 },
    { dq: -1, dr: 1 }
  ];
}
function buildSignalSegments() {
  const segments = [];
  const relayEntities = world.query(Signal, WorldPosition, Identity).filter((e) => e.get(Signal)?.relaySource);
  const hexRelays = /* @__PURE__ */ new Map();
  for (const entity of relayEntities) {
    const pos = entity.get(WorldPosition);
    const id = entity.get(Identity);
    const hex = worldToGrid(pos.x, pos.z);
    const key = hexKey(hex.q, hex.r);
    if (!hexRelays.has(key)) {
      hexRelays.set(key, []);
    }
    hexRelays.get(key).push({
      q: hex.q,
      r: hex.r,
      faction: id.faction
    });
  }
  const createdEdges = /* @__PURE__ */ new Set();
  const neighborOffsets = getHexNeighborOffsets();
  for (const [, relays] of hexRelays) {
    for (const relay of relays) {
      for (const offset of neighborOffsets) {
        const nq = relay.q + offset.dq;
        const nr = relay.r + offset.dr;
        const neighborKey = hexKey(nq, nr);
        const neighborRelays = hexRelays.get(neighborKey);
        if (!neighborRelays) continue;
        const sameFactionNeighbor = neighborRelays.find(
          (n) => n.faction === relay.faction
        );
        if (!sameFactionNeighbor) continue;
        const ek = edgeKey(relay.q, relay.r, nq, nr);
        if (createdEdges.has(ek)) continue;
        createdEdges.add(ek);
        const fromWorld = gridToWorld(relay.q, relay.r);
        const toWorld = gridToWorld(nq, nr);
        segments.push({
          id: `sig_${nextSegmentId++}`,
          type: "signal",
          from: { x: fromWorld.x, z: fromWorld.z },
          to: { x: toWorld.x, z: toWorld.z },
          faction: relay.faction,
          throughput: 1,
          parallelIndex: 0
        });
      }
    }
  }
  const connectedUnits = world.query(Signal, WorldPosition, Identity).filter((e) => e.get(Signal)?.connected && !e.get(Signal)?.relaySource);
  for (const unit of connectedUnits) {
    const unitPos = unit.get(WorldPosition);
    const unitId = unit.get(Identity);
    const unitHex = worldToGrid(unitPos.x, unitPos.z);
    let nearestDist = Number.POSITIVE_INFINITY;
    let nearestRelayHex = null;
    for (const relay of relayEntities) {
      const relayId = relay.get(Identity);
      if (relayId.faction !== unitId.faction) continue;
      const relayPos = relay.get(WorldPosition);
      const dx = unitPos.x - relayPos.x;
      const dz = unitPos.z - relayPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        const rHex = worldToGrid(relayPos.x, relayPos.z);
        nearestRelayHex = rHex;
      }
    }
    if (nearestRelayHex) {
      const ek = edgeKey(
        unitHex.q,
        unitHex.r,
        nearestRelayHex.q,
        nearestRelayHex.r
      );
      if (!createdEdges.has(ek)) {
        createdEdges.add(ek);
        const fromWorld = gridToWorld(unitHex.q, unitHex.r);
        const toWorld = gridToWorld(nearestRelayHex.q, nearestRelayHex.r);
        segments.push({
          id: `sig_${nextSegmentId++}`,
          type: "signal",
          from: { x: fromWorld.x, z: fromWorld.z },
          to: { x: toWorld.x, z: toWorld.z },
          faction: unitId.faction,
          throughput: 0.6,
          parallelIndex: 0
        });
      }
    }
  }
  return segments;
}
function buildPowerSegments() {
  const segments = [];
  const createdEdges = /* @__PURE__ */ new Set();
  for (const rod of lightningRods) {
    const rodPos = rod.get(WorldPosition);
    const rodComp = rod.get(LightningRod);
    if (!rodPos || !rodComp) continue;
    const rodHex = worldToGrid(rodPos.x, rodPos.z);
    const radius = rodComp.protectionRadius || 10;
    for (const building of buildings) {
      const bldg = building.get(Building);
      if (!bldg?.powered) continue;
      if (bldg.type === "lightning_rod") continue;
      const bldgPos = building.get(WorldPosition);
      if (!bldgPos) continue;
      const dx = bldgPos.x - rodPos.x;
      const dz = bldgPos.z - rodPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radius) continue;
      const bldgHex = worldToGrid(bldgPos.x, bldgPos.z);
      const ek = edgeKey(rodHex.q, rodHex.r, bldgHex.q, bldgHex.r);
      if (createdEdges.has(ek)) continue;
      createdEdges.add(ek);
      const throughput = rodComp.rodCapacity > 0 ? Math.min(1, rodComp.currentOutput / rodComp.rodCapacity) : 0;
      const fromWorld = gridToWorld(rodHex.q, rodHex.r);
      const toWorld = gridToWorld(bldgHex.q, bldgHex.r);
      segments.push({
        id: `pwr_${nextSegmentId++}`,
        type: "power",
        from: { x: fromWorld.x, z: fromWorld.z },
        to: { x: toWorld.x, z: toWorld.z },
        faction: "player",
        throughput,
        parallelIndex: 0
      });
    }
  }
  return segments;
}
function buildConduitSegments() {
  const segments = [];
  const createdEdges = /* @__PURE__ */ new Set();
  const fabBuildings = Array.from(buildings).filter(
    (b) => b.get(Building)?.type === "fabrication_unit" && b.get(Building)?.operational
  );
  for (let i = 0; i < fabBuildings.length; i++) {
    for (let j = i + 1; j < fabBuildings.length; j++) {
      const posA = fabBuildings[i].get(WorldPosition);
      const posB = fabBuildings[j].get(WorldPosition);
      if (!posA || !posB) continue;
      const hexA = worldToGrid(posA.x, posA.z);
      const hexB = worldToGrid(posB.x, posB.z);
      const dq = Math.abs(hexA.q - hexB.q);
      const dr = Math.abs(hexA.r - hexB.r);
      const ds = Math.abs(hexA.q + hexA.r - hexB.q - hexB.r);
      const hexDist = Math.max(dq, dr, ds);
      if (hexDist > 3) continue;
      const ek = edgeKey(hexA.q, hexA.r, hexB.q, hexB.r);
      if (createdEdges.has(ek)) continue;
      createdEdges.add(ek);
      const fromWorld = gridToWorld(hexA.q, hexA.r);
      const toWorld = gridToWorld(hexB.q, hexB.r);
      segments.push({
        id: `conduit_${nextSegmentId++}`,
        type: "conduit",
        from: { x: fromWorld.x, z: fromWorld.z },
        to: { x: toWorld.x, z: toWorld.z },
        faction: "player",
        throughput: 1,
        parallelIndex: 0
      });
    }
  }
  return segments;
}
function assignParallelOffsets(segments) {
  const edgeSegments = /* @__PURE__ */ new Map();
  for (const seg of segments) {
    const fromHex = worldToGrid(seg.from.x, seg.from.z);
    const toHex = worldToGrid(seg.to.x, seg.to.z);
    const ek = edgeKey(fromHex.q, fromHex.r, toHex.q, toHex.r);
    if (!edgeSegments.has(ek)) {
      edgeSegments.set(ek, []);
    }
    edgeSegments.get(ek).push(seg);
  }
  const maxParallel = networksConfig.maxParallelPerEdge;
  for (const [, segs] of edgeSegments) {
    const typePriority = {
      signal: 0,
      power: 1,
      conduit: 2
    };
    segs.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
    const offsets = [0, 1, -1];
    for (let i = 0; i < Math.min(segs.length, maxParallel); i++) {
      segs[i].parallelIndex = offsets[i];
    }
  }
}
function buildJunctions(segments) {
  const hexNetworks = /* @__PURE__ */ new Map();
  for (const seg of segments) {
    for (const point of [seg.from, seg.to]) {
      const hex = worldToGrid(point.x, point.z);
      const key = hexKey(hex.q, hex.r);
      if (!hexNetworks.has(key)) {
        const worldPos = gridToWorld(hex.q, hex.r);
        hexNetworks.set(key, {
          x: worldPos.x,
          z: worldPos.z,
          faction: seg.faction,
          types: /* @__PURE__ */ new Set()
        });
      }
      hexNetworks.get(key).types.add(seg.type);
    }
  }
  const junctions = [];
  const structureHexes = /* @__PURE__ */ new Set();
  for (const building of buildings) {
    const pos = building.get(WorldPosition);
    if (!pos) continue;
    const hex = worldToGrid(pos.x, pos.z);
    structureHexes.add(hexKey(hex.q, hex.r));
  }
  for (const [key, info] of hexNetworks) {
    if (info.types.size >= 2) {
      junctions.push({
        x: info.x,
        z: info.z,
        faction: info.faction,
        networkCount: info.types.size,
        hasStructure: structureHexes.has(key)
      });
    }
  }
  return junctions;
}
function getNetworkOverlayState() {
  return overlayState;
}
function resetNetworkOverlay() {
  nextSegmentId = 0;
  overlayState = {
    segments: [],
    junctions: [],
    currentTick: 0
  };
}
function networkOverlaySystem(tick) {
  nextSegmentId = 0;
  const signalSegs = buildSignalSegments();
  const powerSegs = buildPowerSegments();
  const conduitSegs = buildConduitSegments();
  const allSegments = [...signalSegs, ...powerSegs, ...conduitSegs];
  assignParallelOffsets(allSegments);
  const junctions = buildJunctions(allSegments);
  overlayState = {
    segments: allSegments,
    junctions,
    currentTick: tick
  };
}

const REPAIR_RANGE = 3;
const REPAIR_COSTS = {
  metal: { type: "scrapMetal", amount: 3 },
  plastic: { type: "scrapMetal", amount: 1 },
  electronic: { type: "eWaste", amount: 2 }
};
const activeRepairs = [];
function getActiveRepairs() {
  return [...activeRepairs];
}
function startRepair(repairer, target, componentName) {
  if (!hasArms(repairer)) return false;
  if (!repairer.get(WorldPosition) || !target.get(WorldPosition))
    return false;
  const dx = repairer.get(WorldPosition).x - target.get(WorldPosition).x;
  const dz = repairer.get(WorldPosition).z - target.get(WorldPosition).z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > REPAIR_RANGE) return false;
  const components = target.get(Unit) ? target.get(Unit)?.components : target.get(Building)?.components;
  const comp = components?.find(
    (c) => c.name === componentName && !c.functional
  );
  if (!comp) return false;
  const cost = REPAIR_COSTS[comp.material];
  if (!spendResource(cost.type, cost.amount)) return false;
  const existing = activeRepairs.find(
    (r) => r.targetId === target.get(Identity).id && r.componentName === componentName
  );
  if (existing) return false;
  activeRepairs.push({
    repairerId: repairer.get(Identity).id,
    targetId: target.get(Identity).id,
    componentName,
    ticksRemaining: 5,
    totalTicks: 5
  });
  return true;
}
function repairSystem() {
  for (let i = activeRepairs.length - 1; i >= 0; i--) {
    const repair = activeRepairs[i];
    repair.ticksRemaining--;
    if (repair.ticksRemaining <= 0) {
      let found = false;
      for (const unit of units) {
        if (unit.get(Identity)?.id === repair.targetId) {
          const comp = unit.get(Unit)?.components.find(
            (c) => c.name === repair.componentName && !c.functional
          );
          if (comp) comp.functional = true;
          found = true;
          break;
        }
      }
      if (!found) {
        for (const bldg of buildings) {
          if (bldg.get(Identity)?.id === repair.targetId) {
            const comp = bldg.get(Building)?.components.find(
              (c) => c.name === repair.componentName && !c.functional
            );
            if (comp) comp.functional = true;
            break;
          }
        }
      }
      activeRepairs.splice(i, 1);
    }
  }
}

function gridDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
function signalNetworkSystem() {
  let totalCapacity = 0;
  let totalDemand = 0;
  for (const entity of world.query(Compute, Identity)) {
    if (entity.get(Identity)?.faction === "player") {
      const net = entity.get(Compute).contribution - entity.get(Compute).cost;
      if (net > 0) totalCapacity += net;
      else totalDemand += Math.abs(net);
    }
  }
  globalCompute.capacity = totalCapacity;
  globalCompute.demand = totalDemand;
  globalCompute.available = totalCapacity - totalDemand;
  const playerUnits = world.query(Unit, Identity).filter((e) => e.get(Identity)?.faction === "player");
  const relays = world.query(Signal, WorldPosition, Identity).filter(
    (e) => e.get(Identity)?.faction === "player" && e.get(Signal)?.relaySource
  );
  const visited = /* @__PURE__ */ new Set();
  const queue = [...relays];
  while (queue.length > 0) {
    const current = queue.shift();
    visited.add(current.get(Identity).id);
    for (const unit of playerUnits) {
      if (unit.get(WorldPosition) && current.get(WorldPosition) && unit.get(Signal)) {
        const dist = gridDistance(
          current.get(WorldPosition),
          unit.get(WorldPosition)
        );
        if (current.get(Signal) && dist <= current.get(Signal).range) {
          unit.get(Signal).connected = true;
          visited.add(unit.get(Identity).id);
          if (unit.get(Signal)?.relaySource && !visited.has(unit.get(Identity).id)) {
            queue.push(unit);
          }
        }
      }
    }
  }
  for (const unit of playerUnits) {
    if (unit.get(Signal) && !visited.has(unit.get(Identity).id)) {
      unit.get(Signal).connected = false;
    }
  }
}

const ALL_ECONOMY_FACTIONS = [
  "player",
  "rogue",
  "cultist",
  "feral"
];
const RIVAL_FACTIONS = [
  "rogue",
  "cultist",
  "feral"
];
const factionPools = /* @__PURE__ */ new Map();
function ensurePool(factionId) {
  let pool = factionPools.get(factionId);
  if (!pool) {
    pool = defaultResourcePool();
    factionPools.set(factionId, pool);
  }
  return pool;
}
function getFactionResources(factionId) {
  if (factionId === "player") {
    return getResources();
  }
  return { ...ensurePool(factionId) };
}
function addFactionResource(factionId, type, amount) {
  if (factionId === "player") {
    addResource(type, amount);
    return;
  }
  const pool = ensurePool(factionId);
  pool[type] = (pool[type] ?? 0) + amount;
}
function spendFactionResource(factionId, type, amount) {
  if (factionId === "player") {
    return spendResource(type, amount);
  }
  const pool = ensurePool(factionId);
  if ((pool[type] ?? 0) < amount) return false;
  pool[type] = (pool[type] ?? 0) - amount;
  return true;
}
function canFactionAfford(factionId, costs) {
  const pool = getFactionResources(factionId);
  return costs.every(
    (cost) => (pool[cost.type] ?? 0) >= cost.amount
  );
}
function getAllFactionResources() {
  const result = /* @__PURE__ */ new Map();
  result.set("player", getResources());
  for (const faction of RIVAL_FACTIONS) {
    result.set(faction, { ...ensurePool(faction) });
  }
  return result;
}
function seedFactionResources(factionId, resources) {
  if (factionId === "player") {
    setResources(resources);
    return;
  }
  const pool = ensurePool(factionId);
  for (const key of Object.keys(resources)) {
    if (key in resources) {
      pool[key] = resources[key] ?? pool[key];
    }
  }
}
function resetFactionEconomy() {
  factionPools.clear();
  cleanupPoolIndex();
}
const _poolIndex = /* @__PURE__ */ new Map();
const _resourceCache = /* @__PURE__ */ new Map();
function initFactionResourcePools(factionIds) {
  for (const factionId of factionIds) {
    const existing = _poolIndex.get(factionId);
    if (existing?.isAlive()) continue;
    const e = world.spawn(FactionResourcePool);
    e.set(FactionResourcePool, { factionId, resourcesJson: "{}" });
    _poolIndex.set(factionId, e);
    _resourceCache.set(factionId, {});
  }
}
function getFactionResourcesKoota(factionId) {
  const entity = _poolIndex.get(factionId);
  if (entity?.isAlive()) {
    const data = entity.get(FactionResourcePool);
    if (data) return JSON.parse(data.resourcesJson);
  }
  return { ..._resourceCache.get(factionId) ?? {} };
}
function addFactionResourceKoota(factionId, type, amount) {
  const entity = _poolIndex.get(factionId);
  if (!entity) return;
  const cached = _resourceCache.get(factionId) ?? {};
  cached[type] = (cached[type] ?? 0) + amount;
  _resourceCache.set(factionId, cached);
  const cur = entity.get(FactionResourcePool);
  if (cur) {
    entity.set(FactionResourcePool, {
      ...cur,
      resourcesJson: JSON.stringify(cached)
    });
  }
}
function cleanupPoolIndex() {
  for (const entity of _poolIndex.values()) {
    if (entity.isAlive()) entity.destroy();
  }
  _poolIndex.clear();
  _resourceCache.clear();
}

const UNIT_CLAIM_RADIUS = 2;
const BUILDING_CLAIM_RADIUS = 3;
const RECALC_INTERVAL = 30;
const CULTIST_PRESSURE_PER_CELL = 0.01;
const CULTIST_PRESSURE_BASE = 0.1;
const cellOwnership = /* @__PURE__ */ new Map();
const factionStats = /* @__PURE__ */ new Map();
let currentTensions = [];
let ticksSinceRecalc = RECALC_INTERVAL;
const _territoryCellIndex = /* @__PURE__ */ new Map();
function tcKey(q, r) {
  return `${q},${r}`;
}
function spawnTerritoryCell(q, r, owner, strength) {
  const key = tcKey(q, r);
  let entity = _territoryCellIndex.get(key);
  if (!entity || !entity.isAlive()) {
    entity = world.spawn(TerritoryCell);
    _territoryCellIndex.set(key, entity);
  }
  entity.set(TerritoryCell, { q, r, owner, strength });
}
function getTerritoryOwner(q, r) {
  return _territoryCellIndex.get(tcKey(q, r))?.get(TerritoryCell)?.owner ?? null;
}
function clearTerritoryCells() {
  for (const e of _territoryCellIndex.values()) {
    if (e.isAlive()) e.destroy();
  }
  _territoryCellIndex.clear();
}
function cellKey(q, r) {
  return `${q},${r}`;
}
function addClaims(acc, centerQ, centerR, radius, faction) {
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = -radius; dr <= radius; dr++) {
      if (Math.abs(dq) + Math.abs(dr) > radius * 1.5) continue;
      const q = centerQ + dq;
      const r = centerR + dr;
      const key = cellKey(q, r);
      let factionClaims = acc.get(key);
      if (!factionClaims) {
        factionClaims = /* @__PURE__ */ new Map();
        acc.set(key, factionClaims);
      }
      const existing = factionClaims.get(faction);
      if (existing) {
        existing.strength++;
      } else {
        factionClaims.set(faction, { strength: 1, q, r });
      }
    }
  }
}
function computeBorderCells(ownership, faction) {
  const borders = /* @__PURE__ */ new Set();
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ];
  for (const [key, cell] of ownership) {
    if (cell.owner !== faction) continue;
    for (const [dq, dr] of offsets) {
      const neighborKey = cellKey(cell.q + dq, cell.r + dr);
      const neighbor = ownership.get(neighborKey);
      if (!neighbor || neighbor.owner !== faction) {
        borders.add(key);
        break;
      }
    }
  }
  return borders;
}
function recalculate() {
  const acc = /* @__PURE__ */ new Map();
  const tensions = [];
  for (const entity of world.query(Unit, WorldPosition, Identity)) {
    const identity = entity.get(Identity);
    if (!identity) continue;
    const faction = identity.faction;
    if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;
    const pos = entity.get(WorldPosition);
    if (!pos) continue;
    const { q, r } = worldToGrid(pos.x, pos.z);
    addClaims(acc, q, r, UNIT_CLAIM_RADIUS, faction);
  }
  for (const entity of world.query(Building, WorldPosition, Identity)) {
    const identity = entity.get(Identity);
    if (!identity) continue;
    const faction = identity.faction;
    if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;
    const pos = entity.get(WorldPosition);
    if (!pos) continue;
    const { q, r } = worldToGrid(pos.x, pos.z);
    addClaims(acc, q, r, BUILDING_CLAIM_RADIUS, faction);
  }
  clearTerritoryCells();
  cellOwnership.clear();
  for (const [key, factionClaims] of acc) {
    let bestFaction = null;
    let bestStrength = 0;
    let bestQ = 0;
    let bestR = 0;
    for (const [faction, claim] of factionClaims) {
      if (claim.strength > bestStrength) {
        bestFaction = faction;
        bestStrength = claim.strength;
        bestQ = claim.q;
        bestR = claim.r;
      }
    }
    if (bestFaction) {
      cellOwnership.set(key, {
        q: bestQ,
        r: bestR,
        owner: bestFaction,
        strength: bestStrength
      });
      spawnTerritoryCell(bestQ, bestR, bestFaction, bestStrength);
    }
  }
  for (const entity of world.query(Unit, WorldPosition, Identity)) {
    const identity = entity.get(Identity);
    if (!identity) continue;
    const faction = identity.faction;
    if (!ALL_ECONOMY_FACTIONS.includes(faction)) continue;
    const pos = entity.get(WorldPosition);
    if (!pos) continue;
    const { q, r } = worldToGrid(pos.x, pos.z);
    const key = cellKey(q, r);
    const cell = cellOwnership.get(key);
    if (cell && cell.owner !== faction) {
      tensions.push({
        defender: cell.owner,
        intruder: faction,
        q,
        r,
        intruderEntityId: identity.id
      });
    }
  }
  currentTensions = tensions;
  factionStats.clear();
  const cellCounts = /* @__PURE__ */ new Map();
  for (const cell of cellOwnership.values()) {
    cellCounts.set(cell.owner, (cellCounts.get(cell.owner) ?? 0) + 1);
  }
  for (const faction of ALL_ECONOMY_FACTIONS) {
    factionStats.set(faction, {
      cellCount: cellCounts.get(faction) ?? 0,
      borderCells: computeBorderCells(cellOwnership, faction)
    });
  }
}
function territorySystem() {
  ticksSinceRecalc++;
  if (ticksSinceRecalc >= RECALC_INTERVAL) {
    recalculate();
    ticksSinceRecalc = 0;
  }
}
function forceRecalculate() {
  recalculate();
  ticksSinceRecalc = 0;
}
function getCellOwner(q, r) {
  return cellOwnership.get(cellKey(q, r))?.owner ?? null;
}
function getCellTerritory(q, r) {
  return cellOwnership.get(cellKey(q, r)) ?? null;
}
function getFactionCells(faction) {
  const result = [];
  for (const cell of cellOwnership.values()) {
    if (cell.owner === faction) {
      result.push(cell);
    }
  }
  return result;
}
function getFactionTerritoryStats(faction) {
  return factionStats.get(faction) ?? { cellCount: 0, borderCells: /* @__PURE__ */ new Set() };
}
function getFactionTerritorySize(faction) {
  return factionStats.get(faction)?.cellCount ?? 0;
}
function getTerritoryTensions() {
  return currentTensions;
}
function getTensionsForDefender(faction) {
  return currentTensions.filter((t) => t.defender === faction);
}
function getCultistEscalationFactor() {
  let totalNonCultistCells = 0;
  for (const faction of ALL_ECONOMY_FACTIONS) {
    if (faction === "cultist") continue;
    totalNonCultistCells += getFactionTerritorySize(faction);
  }
  return CULTIST_PRESSURE_BASE + totalNonCultistCells * CULTIST_PRESSURE_PER_CELL;
}
function getAllCellOwnership() {
  return cellOwnership;
}
function getFactionBorderCells(faction) {
  return factionStats.get(faction)?.borderCells ?? /* @__PURE__ */ new Set();
}
function isInFactionTerritory(worldX, worldZ, faction) {
  const { q, r } = worldToGrid(worldX, worldZ);
  return getCellOwner(q, r) === faction;
}
function resetTerritorySystem() {
  clearTerritoryCells();
  cellOwnership.clear();
  factionStats.clear();
  currentTensions = [];
  ticksSinceRecalc = RECALC_INTERVAL;
}

let stats = createDefaultStats();
const listeners$1 = /* @__PURE__ */ new Set();
function notify$1() {
  for (const listener of listeners$1) {
    listener();
  }
}
function createDefaultStats() {
  return {
    turnsElapsed: 0,
    structuresHarvested: 0,
    materialsGathered: {},
    cellsDiscovered: 0,
    totalCells: 0,
    unitsBuilt: 0,
    unitsLost: 0,
    unitsHacked: 0,
    structuresBuilt: 0,
    cultistIncursionsSurvived: 0,
    cultistsDestroyed: 0,
    buildingsDestroyed: 0,
    lightningStrikesReceived: 0,
    totalCombatEngagements: 0,
    peakTerritorySize: 0
  };
}
function getCampaignStats() {
  return stats;
}
function subscribeCampaignStats(listener) {
  listeners$1.add(listener);
  return () => listeners$1.delete(listener);
}
function recordTurnEnd() {
  stats = { ...stats, turnsElapsed: stats.turnsElapsed + 1 };
  notify$1();
}
function recordStructureHarvested() {
  stats = {
    ...stats,
    structuresHarvested: stats.structuresHarvested + 1
  };
  notify$1();
}
function recordMaterialGathered(type, amount) {
  const prev = stats.materialsGathered[type] ?? 0;
  stats = {
    ...stats,
    materialsGathered: { ...stats.materialsGathered, [type]: prev + amount }
  };
  notify$1();
}
function recordCellDiscovered(discovered, total) {
  stats = { ...stats, cellsDiscovered: discovered, totalCells: total };
  notify$1();
}
function recordUnitBuilt() {
  stats = { ...stats, unitsBuilt: stats.unitsBuilt + 1 };
  notify$1();
}
function recordUnitLost() {
  stats = { ...stats, unitsLost: stats.unitsLost + 1 };
  notify$1();
}
function recordUnitHacked() {
  stats = { ...stats, unitsHacked: stats.unitsHacked + 1 };
  notify$1();
}
function recordStructureBuilt() {
  stats = { ...stats, structuresBuilt: stats.structuresBuilt + 1 };
  notify$1();
}
function recordIncursionSurvived() {
  stats = {
    ...stats,
    cultistIncursionsSurvived: stats.cultistIncursionsSurvived + 1
  };
  notify$1();
}
function recordCultistDestroyed() {
  stats = {
    ...stats,
    cultistsDestroyed: stats.cultistsDestroyed + 1
  };
  notify$1();
}
function recordBuildingDestroyed() {
  stats = {
    ...stats,
    buildingsDestroyed: stats.buildingsDestroyed + 1
  };
  notify$1();
}
function recordLightningStrike() {
  stats = {
    ...stats,
    lightningStrikesReceived: stats.lightningStrikesReceived + 1
  };
  notify$1();
}
function recordCombatEngagement() {
  stats = {
    ...stats,
    totalCombatEngagements: stats.totalCombatEngagements + 1
  };
  notify$1();
}
function updateTerritorySize(currentSize) {
  if (currentSize > stats.peakTerritorySize) {
    stats = { ...stats, peakTerritorySize: currentSize };
    notify$1();
  }
}
function setCampaignStats(next) {
  stats = { ...stats, ...next };
  notify$1();
}
function serializeCampaignStats() {
  return { ...stats };
}
function rehydrateCampaignStats(saved) {
  stats = { ...createDefaultStats(), ...saved };
  notify$1();
}
function resetCampaignStats() {
  stats = createDefaultStats();
  notify$1();
}

const PERSIST_INTERVAL = 60;
function persistenceSystem(tick) {
  if (tick % PERSIST_INTERVAL !== 0) {
    return;
  }
  const session = getActiveWorldSession();
  if (!session) {
    return;
  }
  const saveGameId = session.saveGame.id;
  const fragments = getStructuralFragments();
  const sectorCells = fragments.flatMap(
    (fragment) => getStructuralCellRecords(fragment.id).map((cell) => ({
      q: cell.q,
      r: cell.r,
      discovery_state: cell.discoveryState
    }))
  );
  const runtime = getRuntimeState();
  persistRuntimeWorldStateSync({
    saveGameId,
    ecumenopolisId: session.ecumenopolis.id,
    tick,
    activeScene: runtime.activeScene,
    activeCityInstanceId: runtime.activeCityInstanceId,
    resources: getResources(),
    sectorCells,
    pointsOfInterest: session.pointsOfInterest.map((poi) => ({
      id: poi.id,
      discovered: poi.discovered
    })),
    cityInstances: session.cityInstances.map((city) => ({
      id: city.id,
      state: city.state
    })),
    entities: capturePersistableWorldEntities()
  });
  persistHarvestStateSync(
    saveGameId,
    Array.from(getConsumedStructureIds()),
    Array.from(getActiveHarvests())
  );
  const turn = getTurnState();
  persistTurnStateSync(
    saveGameId,
    turn.turnNumber,
    turn.phase,
    turn.activeFaction,
    Array.from(turn.unitStates.values())
  );
  const factionResources = getAllFactionResources();
  const factionEntries = [];
  for (const [factionId, pool] of factionResources) {
    factionEntries.push({
      factionId,
      resources: pool
    });
  }
  persistFactionResourceStatesSync(saveGameId, factionEntries);
  persistCampaignStatisticsSync(
    saveGameId,
    getCampaignStats()
  );
}

const POI_DISCOVERY_RADIUS = 8;
const POI_INTERACTION_RADIUS = 5;
function findPoiById(session, poiId) {
  return session.pointsOfInterest.find((poi) => poi.id === poiId) ?? null;
}
function findCityInstanceById(session, cityInstanceId) {
  return session.cityInstances.find(
    (candidate) => candidate.id === cityInstanceId
  ) ?? null;
}
function findCityForPoi(session, poiId) {
  return session.cityInstances.find((candidate) => candidate.poi_id === poiId) ?? null;
}
function markDiscoveredPoisNearPosition(session, position, discoveryRadius = POI_DISCOVERY_RADIUS) {
  for (const poi of session.pointsOfInterest) {
    const dx = poi.q - position.x;
    const dz = poi.r - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= discoveryRadius && poi.discovered === 0) {
      poi.discovered = 1;
    }
  }
}
function findNearbyPoiContext(session, position, interactionRadius = POI_INTERACTION_RADIUS) {
  let bestContext = null;
  let bestActionableContext = null;
  for (const poi of session.pointsOfInterest) {
    const dx = poi.q - position.x;
    const dz = poi.r - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance > interactionRadius) {
      continue;
    }
    const city = findCityForPoi(session, poi.id);
    if (!bestContext || distance < bestContext.distance) {
      bestContext = {
        cityInstanceId: city?.id ?? null,
        discovered: poi.discovered === 1,
        distance,
        name: poi.name,
        poiId: poi.id,
        poiType: poi.type
      };
    }
    const isActionable = isFoundableCityPoiType(poi.type) && city != null && city.state !== "founded";
    if (isActionable && (!bestActionableContext || distance < bestActionableContext.distance)) {
      bestActionableContext = {
        cityInstanceId: city?.id ?? null,
        discovered: poi.discovered === 1,
        distance,
        name: poi.name,
        poiId: poi.id,
        poiType: poi.type
      };
    }
  }
  return bestActionableContext ?? bestContext;
}

function poiSystem() {
  const session = getActiveWorldSession();
  if (!session) {
    return;
  }
  let bestContext = null;
  for (const unit of units) {
    if (unit.get(Identity)?.faction !== "player") {
      continue;
    }
    if (unit.get(WorldPosition) == null) {
      continue;
    }
    const position = unit.get(WorldPosition);
    markDiscoveredPoisNearPosition(session, {
      x: position.x,
      z: position.z
    });
    const nearbyContext = findNearbyPoiContext(session, {
      x: position.x,
      z: position.z
    });
    if (!nearbyContext) {
      continue;
    }
    if (!bestContext || nearbyContext.distance < bestContext.distance) {
      bestContext = nearbyContext;
    }
  }
  setNearbyPoi(bestContext);
}

let tick = 0;
let gameSpeed = 1;
let paused = false;
let worldReady = false;
let lastMergeEvents = [];
const listeners = /* @__PURE__ */ new Set();
let snapshot = null;
const FIXED_SIM_STEP_SECONDS = 1 / 60;
function buildSnapshot() {
  let playerCount = 0;
  let enemyCount = 0;
  for (const u of units) {
    const id = u.get(Identity);
    if (id?.faction === "player") playerCount++;
    else enemyCount++;
  }
  return {
    tick,
    gameSpeed,
    paused,
    worldReady,
    fragments: getStructuralFragments(),
    unitCount: playerCount,
    enemyCount,
    mergeEvents: lastMergeEvents,
    combatEvents: getLastCombatEvents(),
    power: getPowerSnapshot(),
    resources: getResources(),
    fabricationJobs: getActiveJobs(),
    activeThought: getActiveThought(),
    activeScene: getRuntimeState().activeScene,
    activeCityInstanceId: getRuntimeState().activeCityInstanceId,
    cityKitLabOpen: getRuntimeState().cityKitLabOpen,
    nearbyPoiName: getRuntimeState().nearbyPoi?.name ?? null,
    nearbyPoi: getRuntimeState().nearbyPoi,
    weather: getWeatherSnapshot()
  };
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  if (!snapshot) {
    snapshot = buildSnapshot();
  }
  return snapshot;
}
function setGameSpeed(speed) {
  gameSpeed = speed;
  snapshot = null;
  notify();
}
function togglePause() {
  paused = !paused;
  snapshot = null;
  notify();
}
function setPaused(value) {
  if (paused === value) return;
  paused = value;
  snapshot = null;
  notify();
}
function isPaused() {
  return paused;
}
function isWorldReady() {
  return worldReady;
}
function setWorldReady(ready) {
  worldReady = ready;
  snapshot = null;
  notify();
}
function notify() {
  for (const listener of listeners) {
    listener();
  }
}
subscribeRuntimeState(() => {
  snapshot = null;
  notify();
});
function simulationTick() {
  if (paused) {
    return;
  }
  if (!getActiveWorldSession()) {
    return;
  }
  tick++;
  setRuntimeTick(tick);
  if (!worldReady) {
    snapshot = null;
    notify();
    return;
  }
  const delta = FIXED_SIM_STEP_SECONDS * gameSpeed;
  enemySystem();
  aiSystem(delta, tick);
  governorSystem(tick);
  movementSystem(delta, gameSpeed);
  explorationSystem();
  lastMergeEvents = fragmentMergeSystem();
  powerSystem(tick);
  weatherSystem(tick, gameSpeed, getPowerSnapshot().stormIntensity);
  lightningSystem(tick, getPowerSnapshot().stormIntensity);
  signalNetworkSystem();
  networkOverlaySystem(tick);
  resourceSystem();
  harvestSystem(tick);
  repairSystem();
  fabricationSystem();
  combatSystem();
  hackingSystem();
  hackingCaptureSystem();
  motorPoolUpgradeSystem();
  rivalEncounterSystem(tick);
  territorySystem();
  narrativeSystem();
  botSpeechSystem(tick, []);
  poiSystem();
  persistenceSystem(tick);
  if (_audioTickFn) _audioTickFn();
  updateDisplayOffsets();
  snapshot = null;
  notify();
}
let _audioTickFn = null;
function registerAudioTick(fn) {
  _audioTickFn = fn;
}
function resetGameState() {
  tick = 0;
  gameSpeed = 1;
  paused = false;
  worldReady = false;
  lastMergeEvents = [];
  snapshot = null;
  resetWeatherSystem();
  resetLightningSystem();
  resetNetworkOverlay();
  resetHarvestSystem();
  resetRivalEncounterState();
  resetTerritorySystem();
}
const simulationInterval = setInterval(simulationTick, 1e3 / 60);
if (typeof simulationInterval === "object" && simulationInterval !== null && "unref" in simulationInterval && typeof simulationInterval.unref === "function") {
  simulationInterval.unref();
}

export { setGameSpeed as A, BOT_FABRICATION_RECIPES as B, resetNetworkOverlay as C, networkOverlaySystem as D, networksConfig as E, getNetworkOverlayState as F, hasAnyPoints as G, HACK_RANGE as H, subscribe as I, getSnapshot as J, MOTOR_POOL_TIER_CONFIG as M, RECIPES as R, hasActionPoints as a, areFactionsHostile as b, checkHackEligibility as c, startRepair as d, startFabrication as e, getMotorPoolState as f, getUnitTurnState as g, hasMovementPoints as h, initiateHack as i, queueBotFabrication as j, getMarkUpgradeCost as k, logTurnEvent as l, canMotorPoolUpgradeMark as m, isFloorHarvestable as n, isFloorTileConsumed as o, getResourcePoolForFloorMaterial as p, queueThought as q, resetGameState as r, spendActionPoint as s, startFloorHarvest as t, upgradeMotorPool as u, isStructureConsumed as v, isHarvestable as w, getResourcePoolForModel as x, startHarvest as y, togglePause as z };
//# sourceMappingURL=gameState-CXdyHaTz.js.map
