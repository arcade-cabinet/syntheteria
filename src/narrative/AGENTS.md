# narrative/

Speech profiles — personality-driven dialogue lines for robot units and events.

## Rules
- **Static data** — no runtime state, just lookup tables
- **Persona maps to profile** — each faction persona has a `SpeechProfileId`
- **Two trigger types** — `EventSpeechTrigger` (combat, harvest) and `ContextSpeechTrigger` (idle, low HP)
- **Lines are randomized** — `pickSpeechLine()` selects randomly from the pool

## Public API
- `EVENT_SPEECH` — event-triggered dialogue lines by profile
- `CONTEXT_SPEECH` — context-triggered dialogue lines by profile
- `profileForPersona(persona)` — resolve persona to profile ID
- `getEventSpeech()`, `getContextSpeech()` — lookup by profile
- `getEventSpeechByPersona()`, `getContextSpeechByPersona()` — lookup by persona name
- `pickSpeechLine(lines)` — random selection from a line pool

## Files
| File | Purpose |
|------|---------|
| speechProfiles.ts | All speech profiles, triggers, and lookup functions |
