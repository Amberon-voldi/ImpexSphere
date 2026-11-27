export const slugify = (x: string) =>
  x
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "item";

/** Appends a short random suffix until `taken` says the slug is free. */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>) {
  let slug = base;
  for (let i = 0; i < 6 && (await taken(slug)); i++) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return slug;
}
