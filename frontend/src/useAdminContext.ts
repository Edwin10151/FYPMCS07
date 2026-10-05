import { useCallback, useEffect, useState } from "react";
import { errorMessage, getAdminContext, type AdminContext } from "./api";
import { useSession } from "./useSession";
import { useSearchParams } from "react-router-dom";

export function useAdminContext() {
  const session = useSession();
  const [data, setData] = useState<AdminContext | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("semester_id"));
  const selectedPeriod = data?.periods.find((period) => period.semester_id === selectedId)
    ?? data?.periods.find((period) => period.status === "active")
    ?? data?.periods[0] ?? null;
  const selectPeriod = (semesterId: number) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("semester_id", String(semesterId));
      return next;
    });
  };

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

  return { session, data, error, loading, reload, selectedPeriod, selectPeriod };
}
