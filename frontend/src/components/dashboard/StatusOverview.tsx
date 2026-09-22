import type { StatusOverviewData } from "../../api/dashboard";

interface Props {
  data: StatusOverviewData;
}

const STATUS_COLORS: Record<keyof StatusOverviewData, string> = {
  pending: "#f5a623",
  in_transit: "#4a90d9",
  delivered: "#2ecc71",
  delayed: "#e74c3c",
  cancelled: "#9b9b9b",
};

const RADIUS = 40;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StatusOverview({ data }: Props) {
  const keys = Object.keys(data) as (keyof StatusOverviewData)[];
  const total = keys.reduce((sum, key) => sum + data[key], 0) || 1;

  let cumulative = 0;
  const segments = keys
    .filter((key) => data[key] > 0)
    .map((key) => {
      const fraction = data[key] / total;
      const dash = fraction * CIRCUMFERENCE;
      const offset = cumulative * CIRCUMFERENCE;
      cumulative += fraction;
      return { key, dash, offset, color: STATUS_COLORS[key] };
    });

  return (
    <div className="panel">
      <h3>Parcel Status Overview</h3>
      <div className="donut-row">
        <div className="donut-wrap">
          <svg viewBox="0 0 108 108" className="donut-svg">
            <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="54"
                cy="54"
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                strokeDashoffset={-seg.offset}
                transform="rotate(-90 54 54)"
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="donut-center">
            <span className="donut-total">{total}</span>
            <span className="donut-total-label">Parcels</span>
          </div>
        </div>

        <div className="donut-legend">
          {keys.map((key) => (
            <div className="donut-legend-item" key={key}>
              <span className="legend-dot" style={{ backgroundColor: STATUS_COLORS[key] }} />
              <span className="donut-legend-label">{key.replace("_", " ")}</span>
              <span className="donut-legend-value">{data[key]}</span>
              <span className="donut-legend-pct">{Math.round((data[key] / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
