import type { RevenueData } from "../../api/dashboard";

interface Props {
  data: RevenueData;
}

const formatCurrency = (value: number) => `PKR ${Math.round(value).toLocaleString("en-US")}`;

export function RevenueCard({ data }: Props) {
  const rows = [
    { label: "Today", value: data.daily },
    { label: "This Week", value: data.weekly },
    { label: "This Month", value: data.monthly },
  ];

  return (
    <div className="panel">
      <h3>Revenue</h3>
      <div className="revenue-rows">
        {rows.map((row) => (
          <div className="revenue-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{formatCurrency(row.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
