import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useActivity(category: string, live: boolean) {
  return useQuery(
    orpc.activity.list.queryOptions({
      input: { category, limit: 150 },
      refetchInterval: live ? 3000 : false,
    }),
  );
}

export function useActivityStats() {
  return useQuery(orpc.activity.stats.queryOptions({ refetchInterval: 10_000 }));
}

export function useCapabilities() {
  return useQuery(orpc.activity.capabilities.queryOptions({ staleTime: Infinity }));
}

export function useClearActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.activity.clear.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.activity.key() }),
    }),
  );
}
