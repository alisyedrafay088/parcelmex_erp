import { Package, Truck, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { OverviewData } from "../../api/dashboard";

interface Props {
  data: OverviewData;
}

export function OverviewCards({ data }: Props) {
  const cards = [
    { label: "Total Parcels", value: data.total_parcels, icon: Package, tone: "blue" },
    { label: "Active Riders", value: data.active_riders, icon: Truck, tone: "blue" },
    { label: "Pending", value: data.pending_count, icon: Clock, tone: "orange" },
    { label: "Delivered", value: data.delivered_count, icon: CheckCircle2, tone: "green" },
    { label: "Delayed", value: data.delayed_count, icon: AlertTriangle, tone: "red" },
  ] as const;

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div className="card" key={card.label}>
          <div className={`card-icon card-icon-${card.tone}`}>
            <card.icon size={20} />
          </div>
          <div>
            <div className="card-value">{card.value}</div>
            <div className="card-label">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
