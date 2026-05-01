const onboardingScreens = [
  {
    title: "Landing",
    description: "Set the promise, reassure the user, and guide them to a single call to action.",
    detail: "Primary CTA: Create my super agent.",
  },
  {
    title: "Agent setup",
    description: "Collect the agent name, preferred channel, and contact with lightweight validation.",
    detail: "Required fields: agent name, preferred channel, user contact.",
  },
  {
    title: "Provisioning",
    description: "Keep the user informed while the backend provisions the agent and prepares channel activation.",
    detail: "Show a pending state and a deterministic next step.",
  },
  {
    title: "Success",
    description: "Confirm the agent exists, show activation details, and route the user to the chat or detail page.",
    detail: "Success state must surface the channel and activation target.",
  },
];

export function OnboardingOutline() {
  return (
    <article className="panel onboarding-outline">
      <p className="section-label">Screen by screen</p>
      <div className="outline-list">
        {onboardingScreens.map((screen, index) => (
          <div className="outline-card" key={screen.title}>
            <span className="outline-index">0{index + 1}</span>
            <div>
              <h3>{screen.title}</h3>
              <p>{screen.description}</p>
              <small>{screen.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
