import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addEvent = mutation({
  args: {
    deviceId: v.string(),
    category: v.string(),
    confidence: v.number(),
    note: v.optional(v.string()),
    transcript: v.optional(v.string()),
    threatKeywords: v.optional(v.array(v.string())),
    threatLevel: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      deviceId: args.deviceId,
      category: args.category,
      confidence: args.confidence,
      createdAt: Date.now(),
      note: args.note,
      transcript: args.transcript,
      threatKeywords: args.threatKeywords,
      threatLevel: args.threatLevel,
      sessionId: args.sessionId,
    });
    return eventId;
  },
});

export const recentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const events = await ctx.db
      .query("events")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    return events;
  },
});
