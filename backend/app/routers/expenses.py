from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.core.pdf import generate_expense_report_pdf
from app.models.expense import Expense, ExpenseCategory
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseSummary, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["Operating Expenses"], dependencies=[Depends(require_feature("expenses"))])


def _apply_filters(query, start: date | None, end: date | None, category: ExpenseCategory | None):
    if start:
        query = query.filter(Expense.expense_date >= start)
    if end:
        query = query.filter(Expense.expense_date <= end)
    if category:
        query = query.filter(Expense.category == category)
    return query


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    start: date | None = Query(None),
    end: date | None = Query(None),
    category: ExpenseCategory | None = Query(None),
    db: Session = Depends(get_db),
):
    query = _apply_filters(db.query(Expense), start, end, category)
    return query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()


@router.get("/summary", response_model=ExpenseSummary)
def get_expense_summary(
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
):
    query = _apply_filters(db.query(Expense), start, end, None)
    total = query.with_entities(func.coalesce(func.sum(Expense.amount), 0)).scalar()

    by_category: dict[str, float] = {}
    rows = (
        _apply_filters(db.query(Expense.category, func.coalesce(func.sum(Expense.amount), 0)), start, end, None)
        .group_by(Expense.category)
        .all()
    )
    for category, amount in rows:
        by_category[category.value] = float(amount)

    return ExpenseSummary(total=float(total or 0), by_category=by_category)


@router.get("/report/pdf")
def download_expense_report_pdf(
    start: date | None = Query(None),
    end: date | None = Query(None),
    category: ExpenseCategory | None = Query(None),
    db: Session = Depends(get_db),
):
    query = _apply_filters(db.query(Expense), start, end, category)
    expenses = query.order_by(Expense.expense_date.asc(), Expense.id.asc()).all()
    pdf_bytes = generate_expense_report_pdf(expenses, start, end)
    filename = f"operating-expenses-{start or 'all'}-to-{end or 'now'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
