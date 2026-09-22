import { useEffect, useState } from "react";
import {
  dashboardApi,
  type OverviewData,
  type RevenueData,
  type StatusOverviewData,
  type TopClientsData,
  type TrendsData,
} from "../api/dashboard";
import { expensesApi, type ExpenseSummary } from "../api/expenses";
import { OverviewCards } from "../components/dashboard/OverviewCards";
import { RevenueCard } from "../components/dashboard/RevenueCard";
import { StatusOverview } from "../components/dashboard/StatusOverview";
import { TrendsChart } from "../components/dashboard/TrendsChart";
import { LowStockAlert } from "../components/dashboard/LowStockAlert";
import { TopClientsChart } from "../components/dashboard/TopClientsChart";
import { AirwayBillStatusChart } from "../components/dashboard/AirwayBillStatusChart";
import { ExpensesByCategoryChart } from "../components/dashboard/ExpensesByCategoryChart";
import { suppliesApi, type Supply } from "../api/supplies";
import { useAuth } from "../context/AuthContext";

interface DashboardState {
  overview: OverviewData | null;
  revenue: RevenueData | null;
  statusOverview: StatusOverviewData | null;
  trends: TrendsData | null;
  supplies: Supply[];
  topClients: TopClientsData | null;
  expenseSummary: ExpenseSummary | null;
}

export function Dashboard() {
  const { token, user } = useAuth();
  const canSeeExpenses = user?.role === "owner" || user?.role === "finance";
  const [state, setState] = useState<DashboardState>({
    overview: null,
    revenue: null,
    statusOverview: null,
    trends: null,
    supplies: [],
    topClients: null,
    expenseSummary: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const [overview, revenue, statusOverview, trends, supplies, topClients] = await Promise.all([
          dashboardApi.getOverview(token!),
          dashboardApi.getRevenue(token!),
          dashboardApi.getStatusOverview(token!),
          dashboardApi.getTrends(token!, 7),
          suppliesApi.list(token!),
          dashboardApi.getTopClients(token!),
        ]);

        const expenseSummary = canSeeExpenses
          ? await expensesApi.summary(token!).catch(() => null)
          : null;

        if (!cancelled) {
          setState({ overview, revenue, statusOverview, trends, supplies, topClients, expenseSummary });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return <div className="dashboard-status">Loading dashboard...</div>;
  if (error) return <div className="dashboard-status error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <LowStockAlert supplies={state.supplies} />
      {state.overview && <OverviewCards data={state.overview} />}
      <div className="panel-grid">
        {state.revenue && <RevenueCard data={state.revenue} />}
        {state.statusOverview && <StatusOverview data={state.statusOverview} />}
        {state.trends && <TrendsChart data={state.trends} />}
        {state.topClients && <TopClientsChart clients={state.topClients.clients} />}
        {state.statusOverview && <AirwayBillStatusChart data={state.statusOverview} />}
        {state.expenseSummary && <ExpensesByCategoryChart data={state.expenseSummary} />}
      </div>
    </div>
  );
}
