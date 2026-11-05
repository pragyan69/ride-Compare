/** GearCircle wordmark. `dark` is the white version for black backgrounds (footer). */
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={dark ? "logo-full" : "wordmark"} data-dark={dark || undefined}>
      Gear<b>Circle</b>
    </span>
  );
}
