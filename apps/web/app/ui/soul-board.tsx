"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AgentSoul = {
  id: string;
  name: string;
  provider: string;
  channel: string;
  status: string;
};

export function SoulBoard() {
  const [souls, setSouls] = useState<AgentSoul[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchSouls() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/board`);
      if (res.ok) {
        const data = (await res.json()) as { agents: AgentSoul[] };
        setSouls(data.agents);
        setLastUpdated(new Date());
      }
    } catch {
      // silent fail, will retry
    }
  }

  useEffect(() => {
    fetchSouls();
    const interval = setInterval(fetchSouls, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="souls-board">
      {souls.length === 0 ? (
        <p className="souls-empty">No souls yet. Create the first agent to see it light up here.</p>
      ) : (
        <div className="souls-grid">
          {souls.map((soul) => (
            <Link key={soul.id} href={`/agents/${soul.id}`} className="soul-card">
              <div className={`soul-orb soul-orb--${soul.status}`}>
                {soul.name.charAt(0).toUpperCase()}
              </div>
              <p className="soul-name">{soul.name}</p>
              <p className="soul-meta">{soul.channel} · {soul.provider}</p>
              <span className={`soul-status soul-status--${soul.status}`}>
                {soul.status}
              </span>
            </Link>
          ))}
        </div>
      )}
      {lastUpdated && (
        <p className="souls-updated">updated {lastUpdated.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
