import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory, type ExpenseSummary } from "../../api/expenses";

interface Props {
  data: ExpenseSummary;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  salary: "#2563eb",
  bills: "#7c3aed",
  travelling: "#16a34a",
  owner_expense: "#dc2626",
  utilities: "#ca8a04",
  other: "#64748b",
};

const RADIUS = 40;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

export function ExpensesByCategoryChart({ data }: Props) {
  const total = data.total || 1;

  let cumulative = 0;
  const segments = EXPENSE_CATEGORIES.filter((cat) => (data.by_category[cat] ?? 0) > 0).map((cat) => {
    const value = data.by_category[cat] ?? 0;
    const fraction = value / total;
    const dash = fraction * CIRCUMFERENCE;
    const offset = cumulative * CIRCUMFERENCE;
    cumulative += fraction;
    return { cat, value, dash, offset, color: CATEGORY_COLORS[cat] };
  });

  return (
    <div className="panel">
      <h3>Operating Expenses by Category</h3>
      <div className="donut-row">
        <div className="donut-wrap">
          <svg viewBox="0 0 108 108" className="donut-svg">
            <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {segments.map((seg) => (
              <circle
                key={seg.cat}
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
            <span className="donut-total-currency">{formatPkr(data.total)}</span>
            <span className="donut-total-label">Total</span>
          </div>
        </div>

        <div className="donut-legend">
          {EXPENSE_CATEGORIES.map((cat) => {
            const value = data.by_category[cat] ?? 0;
            return (
              <div className="donut-legend-item" key={cat}>
                <span className="legend-dot" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="donut-legend-label">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                <span className="donut-legend-value">{formatPkr(value)}</span>
                <span className="donut-legend-pct">{Math.round((value / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
