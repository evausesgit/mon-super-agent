import Link from "next/link";
import { SoulBoard } from "../ui/soul-board";

export default function SoulsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Control Board</p>
        <h1>All souls.</h1>
        <p className="hero-copy">
          Every agent you have created, live. Watch them breathe.
        </p>
        <div className="hero-actions">
          <Link className="secondary-action" href="/consumption">
            Agent consumption
          </Link>
        </div>
      </section>
      <SoulBoard />
    </main>
  );
}
