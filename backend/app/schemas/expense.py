from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    title: str = Field(min_length=1)
    amount: float = Field(gt=0)
    expense_date: date
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    title: str | None = Field(default=None, min_length=1)
    amount: float | None = Field(default=None, gt=0)
    expense_date: date | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    id: int
    category: ExpenseCategory
    title: str
    amount: float
    expense_date: date
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseSummary(BaseModel):
    total: float
    by_category: dict[str, float]
