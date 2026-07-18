import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { errorMessage, getCurrentOfferingId, getOfferings, loadSession, setCurrentOfferingId } from "./api";

export function useOfferingId() {
  const location = useLocation();
  const stateOfferingId = (location.state as { offeringId?: number } | null)?.offeringId;
  const [offeringId, setOfferingId] = useState<number | null>(stateOfferingId ?? getCurrentOfferingId());
  const [error, setError] = useState("");

  useEffect(() => {
    if (stateOfferingId) {
      setCurrentOfferingId(stateOfferingId);
      setOfferingId(stateOfferingId);
      return;
    }
    if (offeringId) return;
    const session = loadSession();
    if (!session) return;
    getOfferings(session.access_token)
      .then(({ offerings }) => {
        if (offerings.length > 0) {
          setCurrentOfferingId(offerings[0].offering_id);
          setOfferingId(offerings[0].offering_id);
        } else {
          setError("No unit offerings are available yet.");
        }
      })
      .catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateOfferingId, offeringId]);

  return { offeringId, error };
}
