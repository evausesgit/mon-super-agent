import Link from "next/link";
import { ConsumptionDashboard } from "../ui/consumption-dashboard";

export default function ConsumptionPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Agent Consumption</p>
        <h1>Évaluer la consommation de chaque agent.</h1>
        <p className="hero-copy">
          Visualise les tokens mensuels estimés, le budget par modèle et les
          agents qui risquent de peser le plus dans la facture.
        </p>
        <div className="hero-actions">
          <Link className="primary-action" href="/">
            Back to creation flow
          </Link>
          <Link className="secondary-action" href="/souls">
            View all souls
          </Link>
        </div>
      </section>

      <ConsumptionDashboard />
    </main>
  );
}
