import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <b>That page is not here</b>
      The product may have been removed from every store we read. <Link href="/gear" style={{ textDecoration: "underline" }}>Browse the catalog</Link>.
    </div>
  );
}
