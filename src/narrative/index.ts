/**
 * @package narrative
 *
 * Speech profiles and lore dialogue lines for robot personas.
 */

export {
	SPEECH_COOLDOWN_TURNS,
	SPEECH_BUBBLE_DURATION_TURNS,
	EVENT_VISION_RADIUS,
	EVENT_SPEECH,
	CONTEXT_SPEECH,
	PERSONA_TO_PROFILE,
	profileForPersona,
	pickSpeechLine,
	getEventSpeech,
	getContextSpeech,
	getEventSpeechByPersona,
	getContextSpeechByPersona,
} from "./speechProfiles";
export type {
	SpeechProfileId,
	EventSpeechTrigger,
	ContextSpeechTrigger,
} from "./speechProfiles";
