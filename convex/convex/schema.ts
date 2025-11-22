import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    deviceId: v.string(),
    category: v.string(),
    confidence: v.number(),
    createdAt: v.number(),
    note: v.optional(v.string()),
    // Transcript-specific fields
    transcript: v.optional(v.string()),
    threatKeywords: v.optional(v.array(v.string())),
    threatLevel: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  }).index("by_createdAt", ["createdAt"])
    .index("by_session", ["sessionId"]),
});
