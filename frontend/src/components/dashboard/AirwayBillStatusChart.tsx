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

export function AirwayBillStatusChart({ data }: Props) {
  const keys = Object.keys(data) as (keyof StatusOverviewData)[];
  const max = Math.max(...keys.map((key) => data[key]), 1);

  return (
    <div className="panel">
      <h3>Airway Bill - Parcels by Status</h3>
      <div className="hbar-chart">
        {keys.map((key) => (
          <div className="hbar-row" key={key}>
            <span className="hbar-label">{key.replace("_", " ")}</span>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{ width: `${(data[key] / max) * 100}%`, backgroundColor: STATUS_COLORS[key] }}
              />
            </div>
            <span className="hbar-value">{data[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
