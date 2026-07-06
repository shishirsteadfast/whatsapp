/**
 * Converts a caller-supplied phone number (e.g. "+8801712345678") into the
 * WhatsApp chat JID format the engine expects (e.g. "8801712345678@c.us").
 * Values that are already a JID (contain "@", e.g. a group's "...@g.us" id)
 * are passed through unchanged.
 */
export function toChatId(phoneNumber: string): string {
  if (phoneNumber.includes('@')) return phoneNumber;
  return `${phoneNumber.replace(/\D/g, '')}@c.us`;
}
