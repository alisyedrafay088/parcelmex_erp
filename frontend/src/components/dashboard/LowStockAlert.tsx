import { AlertTriangle } from "lucide-react";
import type { Supply } from "../../api/supplies";

interface Props {
  supplies: Supply[];
}

export function LowStockAlert({ supplies }: Props) {
  const lowStock = supplies.filter((s) => s.reorder_level !== null && s.quantity <= s.reorder_level);

  if (lowStock.length === 0) return null;

  return (
    <div className="low-stock-alert">
      <div className="low-stock-alert-header">
        <AlertTriangle size={16} />
        <span>
          {lowStock.length} packaging supply{lowStock.length === 1 ? "" : " items"} running low
        </span>
      </div>
      <div className="low-stock-alert-items">
        {lowStock.map((s) => (
          <span key={s.id} className="low-stock-alert-item">
            {s.name}: {s.quantity} {s.unit} left
          </span>
        ))}
      </div>
    </div>
  );
}
