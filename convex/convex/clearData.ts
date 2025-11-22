import { mutation } from "./_generated/server";

export const clearAllEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
    return { deleted: events.length };
  },
});
