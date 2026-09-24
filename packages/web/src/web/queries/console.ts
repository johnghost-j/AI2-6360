import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useConversations() {
  return useQuery(orpc.chat.listConversations.queryOptions());
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery(
    orpc.chat.getMessages.queryOptions({
      input: { conversationId: conversationId ?? "" },
      enabled: !!conversationId,
      staleTime: Infinity,
    }),
  );
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.chat.createConversation.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.chat.listConversations.key() }),
    }),
  );
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.chat.deleteConversation.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.chat.listConversations.key() }),
    }),
  );
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.chat.renameConversation.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.chat.listConversations.key() }),
    }),
  );
}

export function useSaveMessages() {
  return useMutation(orpc.chat.saveMessages.mutationOptions());
}
