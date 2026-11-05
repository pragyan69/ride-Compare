"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logIn, logOut, requireAdmin } from "@/lib/admin";
import { updateOrder, ORDER_STATUSES } from "@/lib/orders";
import { randomUUID } from "node:crypto";
import { deleteCustom, saveEdits } from "@/lib/product-edits";

export async function login(_: string | null, form: FormData): Promise<string | null> {
  if (!(await logIn(String(form.get("token") ?? "")))) return "That token doesn't match ADMIN_TOKEN.";
  redirect("/admin");
}

export async function logout() {
  await logOut();
  redirect("/admin/login");
}

const ids = (form: FormData) => form.getAll("id").map(String).filter(Boolean);
const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/store", "layout");
  revalidatePath("/");
};

/** Approve, hide or reset (back to unreviewed) one or many products. */
export async function setStatus(form: FormData) {
  await requireAdmin();
  const status = z.enum(["approved", "hidden", "unreviewed"]).parse(form.get("status"));
  await saveEdits(ids(form), { status: status === "unreviewed" ? undefined : status });
  refresh();
}

const editSchema = z.object({
  status: z.enum(["approved", "hidden", "unreviewed"]),
  name: z.string().trim().max(200),
  price: z.coerce.number().int().min(1).max(10_000_000),
  image: z.string().url(),
  sizes: z.string().max(300),
  category: z.string().trim().min(1).max(60),
  note: z.string().trim().max(1000),
});

export type EditResult = { ok: boolean; message: string } | null;

/** Saves the product form. A field equal to the imported value is stored as "no edit", so a re-import can still update it. */
export async function saveProduct(_: EditResult, form: FormData): Promise<EditResult> {
  await requireAdmin();
  const parsed = editSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the fields" };
  const d = parsed.data;
  const id = String(form.get("id"));
  const sizeList = d.sizes.split(",").map((s) => s.trim()).filter(Boolean);
  if (form.get("custom")) {
    // Hand-added product: the form is the product itself, so write it straight in.
    const extra = z.object({ brand: z.string().trim().min(1, "Enter the brand").max(60), mrp: newProductSchema.shape.mrp, photos: z.string().max(5000) }).safeParse(Object.fromEntries(form));
    if (!extra.success) return { ok: false, message: extra.error.issues[0]?.message ?? "Check the fields" };
    const links = extra.data.photos.split(/\s+/).filter(Boolean);
    if (!links.every((u) => /^https:\/\/\S+$/.test(u))) return { ok: false, message: "Photo links must start with https://" };
    const photos = [...new Set([d.image, ...links])];
    await saveEdits([id], {
      status: d.status === "unreviewed" ? undefined : d.status,
      custom: { name: d.name, brand: extra.data.brand, category: d.category, price: d.price, mrp: extra.data.mrp === "" ? null : extra.data.mrp, sizes: sizeList, photos },
      name: undefined, price: undefined, image: undefined, sizes: undefined, category: undefined,
      note: d.note || undefined,
    });
    refresh();
    return { ok: true, message: "Saved" };
  }
  const imported = JSON.parse(String(form.get("imported"))) as { name: string; price: number; image: string; sizes: string[]; category: string };
  const sizes = sizeList;
  const differs = <T,>(v: T, base: T) => (JSON.stringify(v) === JSON.stringify(base) ? undefined : v);
  await saveEdits([id], {
    status: d.status === "unreviewed" ? undefined : d.status,
    name: differs(d.name || imported.name, imported.name),
    price: differs(d.price, imported.price),
    image: differs(d.image, imported.image),
    sizes: differs(sizes, imported.sizes),
    category: differs(d.category, imported.category),
    note: d.note || undefined,
  });
  refresh();
  return { ok: true, message: "Saved" };
}

export async function setOrderStatus(form: FormData) {
  await requireAdmin();
  const status = z.enum(ORDER_STATUSES).parse(form.get("status"));
  await updateOrder(String(form.get("id")), { status });
  revalidatePath("/admin", "layout");
}

/** Quick price change from the product list. */
export async function setPrice(form: FormData) {
  await requireAdmin();
  const price = z.coerce.number().int().min(1).max(10_000_000).parse(form.get("price"));
  const imported = z.coerce.number().int().parse(form.get("imported"));
  await saveEdits(ids(form), { price: price === imported ? undefined : price });
  refresh();
}

const newProductSchema = z.object({
  name: z.string().trim().min(3, "Enter the product name").max(200),
  brand: z.string().trim().min(1, "Enter the brand").max(60),
  category: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().min(1, "Enter a price").max(10_000_000),
  mrp: z.union([z.literal(""), z.coerce.number().int().min(1).max(10_000_000)]),
  sizes: z.string().max(300),
  photos: z.string().max(5000),
  status: z.enum(["approved", "unreviewed", "hidden"]),
});

export type NewProductResult = { error: string } | null;

/** Adds a product that isn't in the catalogue. Photos are web links, one per line; the first is the main photo. */
export async function createProduct(_: NewProductResult, form: FormData): Promise<NewProductResult> {
  await requireAdmin();
  const parsed = newProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields" };
  const d = parsed.data;
  const photos = d.photos.split(/\s+/).map((u) => u.trim()).filter(Boolean);
  if (!photos.length) return { error: "Add at least one photo link" };
  if (!photos.every((u) => z.string().url().safeParse(u).success && /^https:\/\//.test(u))) return { error: "Photo links must start with https://" };
  const slug = `${d.brand} ${d.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const id = `gc-${slug}-${randomUUID().slice(0, 6)}`;
  await saveEdits([id], {
    status: d.status === "unreviewed" ? undefined : d.status,
    custom: {
      name: d.name,
      brand: d.brand,
      category: d.category,
      price: d.price,
      mrp: d.mrp === "" ? null : d.mrp,
      sizes: d.sizes.split(",").map((x) => x.trim()).filter(Boolean),
      photos,
    },
  });
  refresh();
  redirect(`/admin/products/${encodeURIComponent(id)}`);
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  await deleteCustom(String(form.get("id")));
  refresh();
  redirect("/admin/products");
}
