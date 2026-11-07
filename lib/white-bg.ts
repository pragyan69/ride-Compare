import "server-only";
import { sized } from "./image";

const seen = new Map<string, Promise<boolean>>();

/** Edges near white? Then the photo melts into the page; grey or coloured studio backdrops show as a box. */
async function check(src: string) {
  try {
    const sharp = (await import("sharp")).default;
    const res = await fetch(sized(src, 64), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).flatten({ background: "#ffffff" }).resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return Math.min(data[i], data[i + 1], data[i + 2]);
    };
    const w = info.width - 1;
    const h = info.height - 1;
    const edge = [px(0, 0), px(w, 0), px(0, h), px(w, h), px(w >> 1, 0), px(w >> 1, h), px(0, h >> 1), px(w, h >> 1)];
    return edge.every((v) => v >= 243);
  } catch {
    return false;
  }
}

export function hasWhiteBackground(src: string) {
  let p = seen.get(src);
  if (!p) seen.set(src, (p = check(src)));
  return p;
}
