// Simple ID generator for client-side use.
// Uses Math.random instead of crypto.randomUUID for broader compatibility
// (including non-secure contexts like local network IP testing).

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
