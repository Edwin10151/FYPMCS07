/** Persist “LO ↔ PLO mapping confirmed” per unit (local demo until backend owns this). */

const CONFIRM_STORAGE_PREFIX = "mapping-confirmed:";

export type MappingConfirmation = { at: string; by: string };

export function loadMappingConfirmation(unitCode: string): MappingConfirmation | null {
  try {
    const raw = localStorage.getItem(`${CONFIRM_STORAGE_PREFIX}${unitCode}`);
    return raw ? (JSON.parse(raw) as MappingConfirmation) : null;
  } catch {
    return null;
  }
}

export function saveMappingConfirmation(unitCode: string, record: MappingConfirmation) {
  try {
    localStorage.setItem(`${CONFIRM_STORAGE_PREFIX}${unitCode}`, JSON.stringify(record));
  } catch {
    // ignore — audit trail is a nice-to-have for the mock flow
  }
}

export function formatMappingConfirmedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
