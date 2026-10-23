import Image from "next/image";

/** RideCompare logo: rider and wordmark. `dark` is the white version for black backgrounds (footer). */
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Image
      src={dark ? "/brand/rc-logo-dark.png" : "/brand/rc-logo.png"}
      alt="RideCompare"
      width={480}
      height={243}
      priority={!dark}
      className={dark ? "logo-full" : "wordmark"}
    />
  );
}
