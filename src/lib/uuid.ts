/**
 * UUID v4 that works in both secure (HTTPS) and insecure (HTTP LAN) contexts.
 *
 * crypto.randomUUID() is only available in secure contexts; this fallback
 * uses crypto.getRandomValues() which is always available.
 */
export function randomUUID(): string {
	if (typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	const b = new Uint8Array(16);
	crypto.getRandomValues(b);
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
