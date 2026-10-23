import type { Adapter } from "./types";
import { adapter as shopify } from "./shopify";
import { adapter as woocommerce } from "./woocommerce";
import { adapter as magento } from "./magento";
import { adapter as opencart } from "./opencart";
import { adapter as kyt } from "./kyt";

export const ADAPTERS: Record<string, Adapter> = Object.fromEntries([shopify, woocommerce, magento, opencart, kyt].map((a) => [a.platform, a]));
export { Blocked } from "./types";
export type { Adapter, RawRow, Site, PageResult, AdapterContext } from "./types";
