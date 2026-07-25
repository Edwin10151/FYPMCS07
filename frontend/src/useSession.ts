import { useState } from "react";
import { loadSession, type Session } from "./api";

/**
 * loadSession() re-parses localStorage/sessionStorage on every call, which
 * returns a new object reference each time. Reading it directly into a
 * useEffect dependency array causes the effect to re-fire on every render
 * (including the render the effect itself triggers), producing an infinite
 * fetch loop. This hook reads it once and keeps a stable reference.
 */
export function useSession(): Session | null {
  const [session] = useState(() => loadSession());
  return session;
}
