import type { useActivity } from "./useActivity";
import type { ActivityKind } from "@/types/learning";

/** Maps the activity hook to the props ActivityFrame expects. */
export function frameProps<K extends ActivityKind>(act: ReturnType<typeof useActivity<K>>) {
  return {
    item: act.item,
    history: act.history,
    pending: act.pending,
    loadingItem: act.loadingItem,
    error: act.error,
    onNew: act.reset,
  };
}
