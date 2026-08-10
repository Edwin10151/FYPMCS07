import { useCallback, useEffect, useState } from "react";
import { errorMessage, getAdminContext, type AdminContext } from "./api";
import { useSession } from "./useSession";

export function useAdminContext() {
  const session = useSession();
  const [data, setData] = useState<AdminContext | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setData(await getAdminContext(session.access_token));
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { session, data, error, loading, reload };
}
