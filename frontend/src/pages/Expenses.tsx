import { useEffect, useState, type FormEvent } from "react";
import { Download, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import {
  expensesApi,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
} from "../api/expenses";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Expenses() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  async function load() {
    if (!token) return;
    const filters = { start: filterStart || undefined, end: filterEnd || undefined, category: filterCategory || undefined };
    try {
      const [e, s] = await Promise.all([expensesApi.list(token, filters), expensesApi.summary(token, filters)]);
      setExpenses(e);
      setSummary(s);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterCategory, filterStart, filterEnd]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await expensesApi.create(token, {
        category,
        title,
        amount: Number(amount),
        expense_date: expenseDate,
        notes: notes || undefined,
      });
      setTitle("");
      setAmount("");
      setNotes("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const expense = expenses.find((ex) => ex.id === id);
    const ok = await confirm({
      title: "Delete expense?",
      message: `Delete "${expense?.title ?? "this expense"}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await expensesApi.remove(token, id);
    load();
  }

  async function handleDownloadReport() {
    if (!token) return;
    setDownloading(true);
    setError(null);
    try {
      await expensesApi.downloadReport(token, {
        start: filterStart || undefined,
        end: filterEnd || undefined,
        category: filterCategory || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="dashboard-status">Loading expenses...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}

      {summary && (
        <div className="card-grid">
          <div className="card">
            <div className="card-icon card-icon-blue">
              <Wallet size={20} />
            </div>
            <div className="card-content">
              <div className="card-value-currency">{formatPkr(summary.total)}</div>
              <div className="card-label">Total Expenses</div>
            </div>
          </div>
          {EXPENSE_CATEGORIES.map((cat) => (
            <div className="card" key={cat}>
              <div className="card-icon card-icon-orange">
                <Receipt size={20} />
              </div>
              <div className="card-content">
                <div className="card-value-currency">{formatPkr(summary.by_category[cat] ?? 0)}</div>
                <div className="card-label">{EXPENSE_CATEGORY_LABELS[cat]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Receipt size={16} />
            </span>
            <h2>Operating Expenses</h2>
            <span className="fleet-count-badge">{expenses.length}</span>
          </div>
          <div className="fleet-section-actions">
            <input type="date" className="pill-select plain-select" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            <input type="date" className="pill-select plain-select" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
            <select
              className="pill-select plain-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "")}
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="fleet-add-button fleet-add-button-secondary"
              onClick={handleDownloadReport}
              disabled={downloading}
            >
              <Download size={14} /> {downloading ? "Generating..." : "Download PDF Report"}
            </button>
            <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
              <Plus size={14} /> Add Expense
            </button>
          </div>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <input placeholder="Title (e.g. Ali Khan - September Salary)" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount (PKR)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
            <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Title</th>
                <th>Notes</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="fleet-muted">{formatDate(expense.expense_date)}</td>
                  <td>
                    <span className={`status-badge expense-category-${expense.category}`}>
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </span>
                  </td>
                  <td>{expense.title}</td>
                  <td className="fleet-muted">{expense.notes || "—"}</td>
                  <td>{formatPkr(expense.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No expenses recorded for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
