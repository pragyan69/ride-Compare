"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export function BrandList({ brands }: { brands: { name: string; count: number }[] }) {
  const [q, setQ] = useState("");
  const shown = brands.filter((b) => b.name.toLowerCase().includes(q.toLowerCase().trim()));
  return (
    <>
      <div className="search">
        <Search size={20} aria-hidden />
        <input aria-label="Search brands" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands" />
      </div>
      <ul className="brand-index">
        {shown.map((b) => (
          <li key={b.name}>
            <Link href={`/gear?brand=${encodeURIComponent(b.name)}`}>
              <span>{b.name}</span>
              <small>{b.count.toLocaleString("en-IN")}</small>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <div className="empty">
          <h2>No brand by that name</h2>
          <p>Check the spelling or try fewer letters.</p>
        </div>
      )}
    </>
  );
}
