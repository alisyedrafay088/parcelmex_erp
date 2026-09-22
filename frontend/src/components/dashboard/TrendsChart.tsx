import type { TrendsData } from "../../api/dashboard";

interface Props {
  data: TrendsData;
}

export function TrendsChart({ data }: Props) {
  const points = data.points;
  const max = Math.max(...points.map((p) => p.count), 1);

  return (
    <div className="panel">
      <h3>Parcel Volume Trend</h3>
      {points.length === 0 ? (
        <p className="empty-state">No parcel data yet.</p>
      ) : (
        <div className="trend-chart">
          {points.map((point) => (
            <div className="trend-bar-wrapper" key={point.date}>
              <div
                className="trend-bar"
                style={{ height: `${(point.count / max) * 100}%` }}
                title={`${point.date}: ${point.count}`}
              />
              <span className="trend-label">{point.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
