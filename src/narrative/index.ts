/**
 * @package narrative
 *
 * Speech profiles and lore dialogue lines for robot personas.
 */

export type {
	ContextSpeechTrigger,
	EventSpeechTrigger,
	SpeechProfileId,
} from "./speechProfiles";
export {
	CONTEXT_SPEECH,
	EVENT_SPEECH,
	EVENT_VISION_RADIUS,
	getContextSpeech,
	getContextSpeechByPersona,
	getEventSpeech,
	getEventSpeechByPersona,
	PERSONA_TO_PROFILE,
	pickSpeechLine,
	profileForPersona,
	SPEECH_BUBBLE_DURATION_TURNS,
	SPEECH_COOLDOWN_TURNS,
} from "./speechProfiles";
