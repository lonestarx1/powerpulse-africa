import { z } from "zod";

import { advise, PROFILES } from "@/lib/answer";

/** The Google key must never reach the client, so this stays a route handler. */
const RequestSchema = z.object({
  message: z.string().min(1).max(500),
  profile: z.enum(PROFILES),
  coldItems: z.array(z.string().max(60)).max(12).optional(),
  place: z
    .object({ district: z.string(), sector: z.string().nullable() })
    .optional(),
  /** Demo-only: pin "now" so the video can show a live outage on cue. */
  now: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid request", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await advise({
      ...parsed.data,
      now: parsed.data.now ? new Date(parsed.data.now) : undefined,
    });
    return Response.json(result);
  } catch (error) {
    console.error("advise failed", error);
    return Response.json(
      { error: "the model call failed; try again" },
      { status: 502 },
    );
  }
}
