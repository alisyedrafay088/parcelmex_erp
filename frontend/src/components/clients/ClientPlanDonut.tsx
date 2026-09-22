import type { Client, ClientPlan } from "../../api/clients";

interface Props {
  clients: Client[];
}

const PLAN_COLORS: Record<ClientPlan, string> = {
  basic: "#94a3b8",
  standard: "#2563eb",
  premium: "#f5a623",
};

const RADIUS = 52;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ClientPlanDonut({ clients }: Props) {
  const plans: ClientPlan[] = ["basic", "standard", "premium"];
  const counts = plans.map((plan) => ({
    plan,
    count: clients.filter((c) => c.plan === plan).length,
  }));
  const total = clients.length || 1;

  let cumulative = 0;
  const segments = counts
    .filter((c) => c.count > 0)
    .map(({ plan, count }) => {
      const fraction = count / total;
      const dash = fraction * CIRCUMFERENCE;
      const offset = cumulative * CIRCUMFERENCE;
      cumulative += fraction;
      return { plan, count, dash, offset, color: PLAN_COLORS[plan] };
    });

  return (
    <div className="panel">
      <h3>Clients by Plan</h3>
      <div className="donut-row">
        <div className="donut-wrap">
          <svg viewBox="0 0 140 140" className="donut-svg">
            <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {segments.map((seg) => (
              <circle
                key={seg.plan}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                strokeDashoffset={-seg.offset}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="donut-center">
            <span className="donut-total">{clients.length}</span>
            <span className="donut-total-label">Clients</span>
          </div>
        </div>

        <div className="donut-legend">
          {counts.map(({ plan, count }) => (
            <div className="donut-legend-item" key={plan}>
              <span className="legend-dot" style={{ backgroundColor: PLAN_COLORS[plan] }} />
              <span className="donut-legend-label">{plan}</span>
              <span className="donut-legend-value">{count}</span>
              <span className="donut-legend-pct">{Math.round((count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
