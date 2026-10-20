/** Polite HTTP context for adapters: one request per second per host (or the
 * robots.txt crawl delay), robots.txt checks, size limits and blocked-status
 * detection. Works in Cloudflare Workers and Node. */
import { Blocked, type AdapterContext, type FetchedText } from "./types";

/** Browser-like agent. Several retailers return HTTP 403 for anything
 * containing "bot" even on public JSON endpoints that robots.txt allows. */
export const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 RideCompare/2.0";
const MAX_BYTES = 12 * 1024 * 1024;
/** Hard limit per request. Enforced with a race as well as an abort signal
 * because some runtimes keep a stalled body read open after abort. */
const TIMEOUT_MS = 90_000;

type Rule = { allow: boolean; pattern: RegExp; length: number };
export type Robots = { rules: Rule[]; delay: number };

export function parseRobots(text: string, agent = "*"): Robots {
  const groups: { agents: string[]; lines: string[] }[] = [];
  let current: { agents: string[]; lines: string[] } | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) { current = { agents: [], lines: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current) { current.lines.push(`${key}:${value}`); lastWasAgent = false; }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules: Rule[] = [];
  let delay = 0;
  for (const g of chosen) for (const l of g.lines) {
    const i = l.indexOf(":"), key = l.slice(0, i), value = l.slice(i + 1);
    if (key === "crawl-delay") delay = Math.max(delay, Number(value) || 0);
    if ((key === "allow" || key === "disallow") && value) {
      const end = value.endsWith("$");
      const pat = end ? value.slice(0, -1) : value;
      const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (end ? "$" : ""));
      rules.push({ allow: key === "allow", pattern: re, length: pat.replace(/\*/g, "").length });
    }
  }
  return { rules, delay };
}

export function robotsAllows(robots: Robots | null, url: string) {
  if (!robots) return true;
  const u = new URL(url);
  const path = (u.pathname || "/") + (u.search || "");
  let best: Rule | null = null;
  for (const r of robots.rules) if (r.pattern.test(path) && (!best || r.length > best.length)) best = r;
  return best ? best.allow : true;
}

export type HttpOptions = { log?: (m: string) => void; agent?: string; fetchImpl?: typeof fetch; minDelayMs?: number };

/** Creates a context for one site host. Each call fetches robots.txt once. */
export async function createContext(siteUrl: string, options: HttpOptions = {}): Promise<AdapterContext & { robots: Robots | null; requests: number }> {
  const f = options.fetchImpl || fetch;
  const agent = options.agent || USER_AGENT;
  const log = options.log || (() => {});
  const host = new URL(siteUrl).hostname;
  let last = 0;
  let robots: Robots | null = null;
  let delay = Math.max(options.minDelayMs ?? 1000, 0);
  const state = { requests: 0 };

  async function pace() {
    const wait = delay - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
  }
  async function raw(url: string, init?: RequestInit): Promise<FetchedText> {
    await pace();
    state.requests++;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`No response within ${TIMEOUT_MS / 1000} s`)); }, TIMEOUT_MS); });
    timeout.catch(() => {});
    try {
      const response = await Promise.race([f(url, { ...init, headers: { "User-Agent": agent, Accept: "application/json, text/html;q=0.9, */*;q=0.5", "Accept-Language": "en-IN,en;q=0.8", ...(init?.headers as Record<string, string> | undefined) }, redirect: "follow", signal: controller.signal }), timeout]);
      const type = response.headers.get("content-type") || "";
      if (/^(image|video|audio)\//.test(type) || type.startsWith("application/pdf")) { await response.body?.cancel(); return { status: 415, text: "", headers: response.headers }; }
      const text = await Promise.race([response.text(), timeout]);
      if (text.length > MAX_BYTES) throw new Blocked("Page exceeds the 12 MB response limit");
      return { status: response.status, text, headers: response.headers };
    } finally { clearTimeout(timer); }
  }
  try {
    const r = await raw(`${new URL(siteUrl).origin}/robots.txt`);
    if (r.status === 200 && !/^\s*</.test(r.text)) { robots = parseRobots(r.text, agent); if (robots.delay) delay = Math.max(delay, robots.delay * 1000); }
    else if (r.status === 401 || r.status === 403) throw new Blocked(`robots.txt returned HTTP ${r.status}`);
  } catch (e) {
    if (e instanceof Blocked) throw e;
    log(`robots.txt unreadable for ${host}: ${(e as Error).message}`);
  }

  async function fetchText(url: string, init?: RequestInit): Promise<FetchedText> {
    if (new URL(url).hostname !== host && !new URL(url).hostname.endsWith("." + host.replace(/^www\./, "")) && host.replace(/^www\./, "") !== new URL(url).hostname.replace(/^www\./, "")) throw new Error(`Adapter tried to leave ${host}: ${url}`);
    if (!robotsAllows(robots, url)) throw new Blocked(`robots.txt disallows ${new URL(url).pathname}`);
    const r = await raw(url, init);
    if ([401, 403, 429].includes(r.status)) throw new Blocked(`HTTP ${r.status}: retailer access restriction`);
    if (r.status >= 500) throw new Error(`HTTP ${r.status}: retailer temporarily unavailable`);
    if (/<title>[^<]*(just a moment|access denied|robot check|captcha)/i.test(r.text.slice(0, 4000))) throw new Blocked("The store requires a browser verification or CAPTCHA");
    return r;
  }
  async function fetchJson<T>(url: string, init?: RequestInit) {
    const r = await fetchText(url, init);
    let data: T;
    try { data = JSON.parse(r.text) as T; } catch { throw new Error(`Not JSON (HTTP ${r.status}) at ${new URL(url).pathname}`); }
    return { status: r.status, data, headers: r.headers };
  }
  return { fetchText, fetchJson, log, robots, get requests() { return state.requests; } };
}
