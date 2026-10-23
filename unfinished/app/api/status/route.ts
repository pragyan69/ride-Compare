/** Owner-only collection status: per-store state and recent runs. */
import { json, failure, guard } from "@/lib/api";
import { storeStatus } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await guard(req);
    return json(await storeStatus());
  } catch (e) { return failure(e); }
}
