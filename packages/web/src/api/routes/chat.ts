import z from "zod";
import { desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import { conversations, messages } from "../database/schema";

export const chat = {
  listConversations: base.handler(() =>
    db.select().from(conversations).orderBy(desc(conversations.updatedAt)).limit(100),
  ),

  createConversation: base
    .input(z.object({ title: z.string().optional() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .insert(conversations)
        .values({
          id: crypto.randomUUID(),
          title: input.title ?? "Nouvelle session",
        })
        .returning();
      return row;
    }),

  renameConversation: base
    .input(z.object({ id: z.string(), title: z.string() }))
    .handler(async ({ input }) => {
      await db
        .update(conversations)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(conversations.id, input.id));
      return { ok: true };
    }),

  deleteConversation: base
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await db.delete(messages).where(eq(messages.conversationId, input.id));
      await db.delete(conversations).where(eq(conversations.id, input.id));
      return { ok: true };
    }),

  getMessages: base
    .input(z.object({ conversationId: z.string() }))
    .handler(async ({ input }) => {
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt);
      return rows.map((row) => JSON.parse(row.payload) as Record<string, unknown>);
    }),

  saveMessages: base
    .input(
      z.object({
        conversationId: z.string(),
        messages: z.array(z.object({ id: z.string(), role: z.string() }).loose()),
      }),
    )
    .handler(async ({ input }) => {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);
      if (!conversation) throw new ORPCError("NOT_FOUND", { message: "Session introuvable" });

      await db.delete(messages).where(eq(messages.conversationId, input.conversationId));
      if (input.messages.length > 0) {
        await db.insert(messages).values(
          input.messages.map((message) => ({
            id: `${input.conversationId}:${message.id}`,
            conversationId: input.conversationId,
            role: String(message.role),
            payload: JSON.stringify(message),
          })),
        );
      }
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, input.conversationId));
      return { saved: input.messages.length };
    }),
};
