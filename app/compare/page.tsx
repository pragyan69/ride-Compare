import type { Metadata } from "next";
import { CompareTable } from "@/components/compare-table";

export const metadata: Metadata = { title: "Compare products" };

export default function ComparePage() {
  return (
    <>
      <section className="hero">
        <h1>Compare <em>side by side</em></h1>
        <p>Add up to four products from any listing with the “+ Compare” button. Your selection stays in this browser.</p>
      </section>
      <CompareTable />
    </>
  );
}
