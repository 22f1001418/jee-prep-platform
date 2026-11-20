import {useEffect, useSyncExternalStore} from "react";
import {fetchLivePercentile, liveStatus, liveVersion, subscribeLive} from "./percentile";

// Starts the live fetch for these exams and re-renders when the tables arrive. Returns the status of the first one:
// "idle" | "loading" | "live" | "fallback".
export function useLivePercentile(...paperIds){
  useSyncExternalStore(subscribeLive, liveVersion, liveVersion);
  const key = paperIds.filter(Boolean).join("|");
  useEffect(() => { key.split("|").filter(Boolean).forEach(id => { fetchLivePercentile(id); }); }, [key]);
  return paperIds[0] ? liveStatus(paperIds[0]) : "idle";
}
