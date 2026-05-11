import Link from "next/link";
import { OnboardingOutline } from "./ui/onboarding-outline";
import { AgentCreationForm } from "./ui/agent-creation-form";

const channels = [
  {
    name: "Telegram",
    description: "Fastest path to a working MVP with low setup friction.",
    status: "Recommended for MVP",
  },
  {
    name: "WhatsApp",
    description: "High-value channel for later once provisioning and support flows are stable.",
    status: "Planned after Telegram",
  },
];

const steps = [
  "Name your super agent",
  "Choose your messaging channel",
  "Create the agent",
  "Start the first conversation",
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Mon Super Agent</p>
          <h1 className="page-title">Create your personal AI agent.</h1>
        </div>
        <div className="hero-actions">
          <Link className="secondary-action" href="/souls">
            View all souls
          </Link>
          <Link className="secondary-action" href="/consumption">
            Agent consumption
          </Link>
        </div>
      </header>

      <section id="create-agent">
        <AgentCreationForm />
      </section>

      <section className="panel-grid" aria-label="Product overview" style={{ marginTop: "3rem" }}>
        <article className="panel">
          <p className="section-label">How it works</p>
          <ol className="step-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <p className="section-label">Channel strategy</p>
          <div className="channel-list">
            {channels.map((channel) => (
              <div className="channel-card" key={channel.name}>
                <div>
                  <h2>{channel.name}</h2>
                  <p>{channel.description}</p>
                </div>
                <span className="channel-status">{channel.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <OnboardingOutline />
      </section>
    </main>
  );
}
