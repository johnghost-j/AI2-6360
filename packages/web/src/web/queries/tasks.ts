import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useTasks() {
  return useQuery(orpc.tasks.list.queryOptions({ refetchInterval: 5000 }));
}

function useTaskMutation<T extends "create" | "toggle" | "remove" | "runNow">(action: T) {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.tasks[action].mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.tasks.key() }),
    }),
  );
}

export const useCreateTask = () => useTaskMutation("create");
export const useToggleTask = () => useTaskMutation("toggle");
export const useRemoveTask = () => useTaskMutation("remove");
export const useRunTask = () => useTaskMutation("runNow");
