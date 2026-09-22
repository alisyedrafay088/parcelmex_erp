import { Boxes, CheckCircle2, Package, PackageCheck, Phone, Truck, User, XCircle } from "lucide-react";
import type { ParcelStatus } from "../../api/parcels";

interface Props {
  status: ParcelStatus;
  riderName?: string | null;
  riderPhone?: string | null;
}

const STEP_ORDER: ParcelStatus[] = ["pending", "picked", "packed", "in_transit", "delivered"];

const STEPS = [
  { key: "pending", label: "Booked", icon: Package },
  { key: "picked", label: "Picked", icon: PackageCheck },
  { key: "packed", label: "Packed", icon: Boxes },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

export function ParcelTracker({ status, riderName, riderPhone }: Props) {
  if (status === "cancelled") {
    return (
      <div className="parcel-tracker-cancelled">
        <XCircle size={16} /> This parcel was cancelled.
      </div>
    );
  }

  const isDelayed = status === "delayed";
  const activeKey = isDelayed ? "in_transit" : status;
  const currentIndex = STEP_ORDER.indexOf(activeKey);

  return (
    <div className="parcel-tracker">
      <div className="parcel-tracker-steps">
        {STEPS.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          const Icon = step.icon;
          const showRiderHere = state === "current" && (step.key === "picked" || step.key === "in_transit") && riderName;
          return (
            <div
              key={step.key}
              className={`parcel-tracker-step parcel-tracker-step-${state}${
                state === "current" && isDelayed ? " parcel-tracker-step-delayed" : ""
              }`}
            >
              <span className="parcel-tracker-dot">
                {state === "done" ? <CheckCircle2 size={15} /> : <Icon size={14} />}
              </span>
              <span className="parcel-tracker-label">
                {state === "current" && isDelayed ? "Delayed" : step.label}
              </span>
              {showRiderHere && (
                <span className="parcel-tracker-rider">
                  <User size={11} /> {riderName}
                  {riderPhone && (
                    <>
                      {" "}
                      <Phone size={11} /> {riderPhone}
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
