import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useTree(path: string) {
  return useQuery(orpc.workspace.tree.queryOptions({ input: { path } }));
}

export function useFileContent(path: string | null) {
  return useQuery(
    orpc.workspace.readFile.queryOptions({
      input: { path: path ?? "" },
      enabled: !!path,
    }),
  );
}

export function useSystem() {
  return useQuery(orpc.workspace.system.queryOptions({ refetchInterval: 15_000 }));
}

export function useCredentials() {
  return useQuery(orpc.workspace.listCredentials.queryOptions());
}

export function useSaveCredential() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.workspace.saveCredential.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.workspace.listCredentials.key() }),
    }),
  );
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.workspace.deleteCredential.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.workspace.listCredentials.key() }),
    }),
  );
}

export function useMemories() {
  return useQuery(orpc.workspace.listMemories.queryOptions({ refetchInterval: 10_000 }));
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.workspace.deleteMemory.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.workspace.listMemories.key() }),
    }),
  );
}
