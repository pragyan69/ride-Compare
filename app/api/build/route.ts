import { z } from "zod";
import { failure, json } from "@/lib/api";
import { catalogue } from "@/lib/catalog-server";
import { buildKits, buildPools, pieces, ridingStyles, type Pools, type RidingStyle } from "@/lib/kit";

const input = z.object({
  budget: z.number().int().min(500, "Enter a budget of at least ₹500.").max(1_000_000, "Enter a budget under ₹10,00,000."),
  style: z.enum(ridingStyles.map((s) => s.id) as [RidingStyle, ...RidingStyle[]]),
  pieces: z.array(z.enum(pieces)).min(1, "Pick at least one piece of gear.").max(pieces.length),
});

let pools: Promise<Pools> | undefined;

export async function POST(req: Request) {
  try {
    const { budget, style, pieces: wanted } = input.parse(await req.json());
    pools ??= catalogue().then((s) => buildPools(s.products)).catch((e: unknown) => {
      pools = undefined;
      throw e;
    });
    return json(buildKits(await pools, budget, style, [...new Set(wanted)]));
  } catch (e) {
    return failure(e instanceof SyntaxError ? new Error("Send the budget, style and pieces as JSON.") : e);
  }
}
