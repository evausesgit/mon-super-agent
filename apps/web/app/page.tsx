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
      <section className="hero-card">
        <p className="eyebrow">Mon Super Agent</p>
        <h1>Create your personal AI agent in minutes.</h1>
        <p className="hero-copy">
          Start from the web, choose your messaging app, and begin talking to
          your own super agent right away.
        </p>

        <div className="hero-actions">
          <a className="primary-action" href="#create-agent">
            Create my super agent
          </a>
          <p className="helper-copy">
            First implementation target: Telegram-first onboarding.
          </p>
        </div>
      </section>

      <section className="panel-grid" aria-label="Product overview">
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

      <section className="form-panel" id="create-agent">
        <div className="form-panel-copy">
          <p className="section-label">First MVP flow</p>
          <h2>Provision a first super agent</h2>
          <p>
            This form is the first vertical slice of the product. It collects
            the minimum data we need, calls the provisioning API, and returns
            the next step for channel activation.
          </p>
        </div>

        <div className="form-stack">
          <AgentCreationForm />
          <OnboardingOutline />
        </div>
      </section>
    </main>
  );
}
