import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useAiSettings() {
  return useQuery(orpc.settings.get.queryOptions());
}

function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.settings.get.key() });
}

export function useSaveAbliteration() {
  const invalidate = useInvalidateSettings();
  return useMutation(orpc.settings.saveAbliteration.mutationOptions({ onSuccess: invalidate }));
}

export function useSetProvider() {
  const invalidate = useInvalidateSettings();
  return useMutation(orpc.settings.setProvider.mutationOptions({ onSuccess: invalidate }));
}

export function useClearAbliteration() {
  const invalidate = useInvalidateSettings();
  return useMutation(orpc.settings.clearAbliteration.mutationOptions({ onSuccess: invalidate }));
}

export function useTestAbliteration() {
  return useMutation(orpc.settings.testAbliteration.mutationOptions());
}
