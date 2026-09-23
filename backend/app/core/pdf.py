import io
from datetime import date

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.code128 import Code128
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.core.prediction import detect_city
from app.models.client import Client
from app.models.expense import Expense
from app.models.invoice import Invoice
from app.models.parcel import Parcel

NAVY = colors.HexColor("#173a5e")
ORANGE = colors.HexColor("#f5a623")
GREY = colors.HexColor("#64748b")
LIGHT_GREY = colors.HexColor("#f1f5f9")
BORDER_GREY = colors.HexColor("#cbd5e1")


def generate_invoice_pdf(invoice: Invoice, client: Client) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header band
    c.setFillColor(NAVY)
    c.rect(0, height - 30 * mm, width, 30 * mm, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-BoldOblique", 20)
    c.drawString(20 * mm, height - 16 * mm, "ZUHA EXPRESS.")
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-BoldOblique", 9)
    c.drawString(20 * mm, height - 22 * mm, "SMART LOGISTICS, POWERED BY AI")

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(width - 20 * mm, height - 16 * mm, "INVOICE")
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 20 * mm, height - 22 * mm, invoice.invoice_number)

    y = height - 45 * mm

    # Bill to
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(20 * mm, y, "BILL TO")
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, y - 6 * mm, client.name)
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y - 12 * mm, client.email)
    if client.phone:
        c.drawString(20 * mm, y - 18 * mm, client.phone)

    # Meta box (right side)
    meta_x = width - 80 * mm
    meta_y = y
    rows = [
        ("Issued", invoice.issued_at.strftime("%Y-%m-%d")),
        ("Period", f"{invoice.period_start} to {invoice.period_end}"),
        ("Due Date", str(invoice.due_date) if invoice.due_date else "-"),
        ("Status", invoice.status.value.upper()),
    ]
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(GREY)
    for i, (label, value) in enumerate(rows):
        row_y = meta_y - i * 6 * mm
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(GREY)
        c.drawString(meta_x, row_y, label)
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.black)
        c.drawRightString(width - 20 * mm, row_y, value)

    # Divider
    line_y = y - 30 * mm
    c.setStrokeColor(LIGHT_GREY)
    c.setLineWidth(1)
    c.line(20 * mm, line_y, width - 20 * mm, line_y)

    # Amount table header
    table_y = line_y - 12 * mm
    c.setFillColor(LIGHT_GREY)
    c.rect(20 * mm, table_y - 6 * mm, width - 40 * mm, 10 * mm, fill=1, stroke=0)
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(24 * mm, table_y - 2.5 * mm, "DESCRIPTION")
    c.drawRightString(width - 24 * mm, table_y - 2.5 * mm, "AMOUNT")

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 10)
    desc_y = table_y - 16 * mm
    c.drawString(24 * mm, desc_y, f"Parcel delivery services ({invoice.period_start} to {invoice.period_end})")
    c.drawRightString(width - 24 * mm, desc_y, f"PKR {invoice.amount:,.0f}")

    # Total
    total_y = desc_y - 14 * mm
    c.setStrokeColor(LIGHT_GREY)
    c.line(20 * mm, total_y + 6 * mm, width - 20 * mm, total_y + 6 * mm)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(24 * mm, total_y, "TOTAL DUE")
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(width - 24 * mm, total_y, f"PKR {invoice.amount:,.0f}")

    # Footer
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, 15 * mm, "Thank you for partnering with ZUHA Express.")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


# ---------------------------------------------------------------------------
# Airway bill (landscape courier-style shipping label, e.g. PostEx / Leopards)
# ---------------------------------------------------------------------------

LABEL_WIDTH = 150 * mm
LABEL_HEIGHT = 100 * mm
LABEL_MARGIN = 4 * mm
GRID_GAP = 2.5 * mm
ROW_FONT_SIZE = 6.8
ROW_LINE_HEIGHT = 3.0 * mm
ROW_GAP = 1.0 * mm
TITLE_BAR_HEIGHT = 4 * mm
ROW_LABEL_WIDTH = 17 * mm
MAX_ROW_LINES = 2


def _wrap_lines(text: str, font_name: str, font_size: float, max_width: float, max_lines: int = 2) -> list[str]:
    words = (text or "-").split() or ["-"]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
            if len(lines) == max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines or ["-"]


def _rows_height(rows: list[tuple[str, str]], value_width: float) -> float:
    total = 0.0
    for _, value in rows:
        lines = _wrap_lines(value, "Helvetica", ROW_FONT_SIZE, value_width, MAX_ROW_LINES)
        total += len(lines) * ROW_LINE_HEIGHT + ROW_GAP
    return total


def _draw_box_frame(c: canvas.Canvas, x: float, y_bottom: float, width: float, height: float, title: str) -> float:
    """Draws a bordered, titled box and returns the y at which row content should start."""
    c.setStrokeColor(BORDER_GREY)
    c.setLineWidth(0.5)
    c.rect(x, y_bottom, width, height, fill=0, stroke=1)

    c.setFillColor(LIGHT_GREY)
    c.rect(x, y_bottom + height - TITLE_BAR_HEIGHT, width, TITLE_BAR_HEIGHT, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", ROW_FONT_SIZE)
    c.drawString(x + 1.5 * mm, y_bottom + height - TITLE_BAR_HEIGHT + 1.3 * mm, title)

    return y_bottom + height - TITLE_BAR_HEIGHT - 2.6 * mm


def _draw_rows(c: canvas.Canvas, x: float, content_top: float, value_width: float, rows: list[tuple[str, str]]) -> None:
    row_top = content_top
    for label, value in rows:
        lines = _wrap_lines(value, "Helvetica", ROW_FONT_SIZE, value_width, MAX_ROW_LINES)
        c.setFont("Helvetica-Bold", ROW_FONT_SIZE)
        c.setFillColor(GREY)
        c.drawString(x + 1.5 * mm, row_top, f"{label}:")
        c.setFont("Helvetica", ROW_FONT_SIZE)
        c.setFillColor(colors.black)
        line_y = row_top
        for line in lines:
            c.drawString(x + ROW_LABEL_WIDTH, line_y, line)
            line_y -= ROW_LINE_HEIGHT
        row_top = line_y - ROW_GAP


def generate_airway_bill_pdf(parcel: Parcel, client: Client) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(LABEL_WIDTH, LABEL_HEIGHT))
    content_width = LABEL_WIDTH - 2 * LABEL_MARGIN

    destination_city = detect_city(parcel.destination_address)
    destination_label = destination_city.title() if destination_city else (parcel.destination_address or "-")
    route_code = f"{(destination_city or 'gen')[:3].upper()}-1"

    # --- Header: brand (left), barcode + route code (right) ---
    header_h = 10 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-BoldOblique", 13)
    c.drawString(LABEL_MARGIN, LABEL_HEIGHT - 5.5 * mm, "ZUHA")
    brand_w = stringWidth("ZUHA ", "Helvetica-BoldOblique", 13)
    c.setFillColor(ORANGE)
    c.drawString(LABEL_MARGIN + brand_w, LABEL_HEIGHT - 5.5 * mm, "EXPRESS.")

    c.setFillColor(GREY)
    c.setFont("Helvetica", 5.5)
    c.drawString(LABEL_MARGIN, LABEL_HEIGHT - 9 * mm, "SMART LOGISTICS, POWERED BY AI")

    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(LABEL_WIDTH - LABEL_MARGIN, LABEL_HEIGHT - 4.5 * mm, route_code)

    barcode = Code128(parcel.tracking_id, barHeight=6 * mm, barWidth=0.26 * mm)
    barcode_x = LABEL_WIDTH - LABEL_MARGIN - barcode.width
    while barcode_x < LABEL_WIDTH * 0.55 and barcode.barWidth > 0.1 * mm:
        barcode.barWidth -= 0.02 * mm
        barcode = Code128(parcel.tracking_id, barHeight=6 * mm, barWidth=barcode.barWidth)
        barcode_x = LABEL_WIDTH - LABEL_MARGIN - barcode.width
    c.setFillColor(colors.black)
    barcode.drawOn(c, barcode_x, LABEL_HEIGHT - 9.5 * mm)

    c.setStrokeColor(BORDER_GREY)
    c.setLineWidth(0.6)
    c.line(LABEL_MARGIN, LABEL_HEIGHT - header_h, LABEL_WIDTH - LABEL_MARGIN, LABEL_HEIGHT - header_h)

    grid_top = LABEL_HEIGHT - header_h - 2.5 * mm

    # --- Top grid: Consignee | Shipment | Order (with QR) ---
    col_width = (content_width - 2 * GRID_GAP) / 3
    col1_x = LABEL_MARGIN
    col2_x = col1_x + col_width + GRID_GAP
    col3_x = col2_x + col_width + GRID_GAP
    value_width = col_width - ROW_LABEL_WIDTH

    consignee_rows = [
        ("Name", parcel.receiver_name or "-"),
        ("Contact", parcel.receiver_phone or "-"),
        ("Address", parcel.destination_address or "-"),
    ]
    shipment_rows = [
        ("Pieces", str(parcel.quantity)),
        ("Order Ref", f"{parcel.id:04d}"),
        ("Tracking No", parcel.tracking_id),
        ("Weight", f"{parcel.weight_kg} kg"),
        ("Destination", destination_label),
    ]
    order_rows = [
        ("Amount", f"PKR {parcel.amount:,.0f}" if parcel.amount else "Pending"),
        ("Date", parcel.created_at.strftime("%d/%m/%Y")),
        ("Order Type", "Normal"),
    ]

    qr_size = 15 * mm
    col1_h = TITLE_BAR_HEIGHT + _rows_height(consignee_rows, value_width) + 1.5 * mm
    col2_h = TITLE_BAR_HEIGHT + _rows_height(shipment_rows, value_width) + 1.5 * mm
    col3_h = TITLE_BAR_HEIGHT + qr_size + 1.5 * mm + _rows_height(order_rows, value_width) + 1.5 * mm
    top_row_height = max(col1_h, col2_h, col3_h)
    top_row_bottom = grid_top - top_row_height

    content_top1 = _draw_box_frame(c, col1_x, top_row_bottom, col_width, top_row_height, "CONSIGNEE INFORMATION")
    _draw_rows(c, col1_x, content_top1, value_width, consignee_rows)

    content_top2 = _draw_box_frame(c, col2_x, top_row_bottom, col_width, top_row_height, "SHIPMENT INFORMATION")
    _draw_rows(c, col2_x, content_top2, value_width, shipment_rows)

    content_top3 = _draw_box_frame(c, col3_x, top_row_bottom, col_width, top_row_height, "ORDER INFORMATION")
    tracking_url = f"{settings.frontend_url}/track?id={parcel.tracking_id}"
    qr_widget = QrCodeWidget(tracking_url)
    bounds = qr_widget.getBounds()
    qr_src_w = bounds[2] - bounds[0]
    qr_src_h = bounds[3] - bounds[1]
    qr_drawing = Drawing(qr_size, qr_size, transform=[qr_size / qr_src_w, 0, 0, qr_size / qr_src_h, 0, 0])
    qr_drawing.add(qr_widget)
    renderPDF.draw(qr_drawing, c, col3_x + col_width - qr_size - 1.5 * mm, content_top3 - qr_size + 2.6 * mm)
    _draw_rows(c, col3_x, content_top3 - qr_size - 1.5 * mm, value_width, order_rows)

    # --- Bottom section: Shipper Information | Order Details ---
    bottom_top = top_row_bottom - 2.5 * mm
    shipper_width = col_width
    details_width = content_width - shipper_width - GRID_GAP
    details_x = col1_x + shipper_width + GRID_GAP

    shipper_rows = [("Name", client.name), ("Contact", client.phone or "-")]
    details_rows = [("Details", parcel.description or "-")]

    shipper_value_width = shipper_width - ROW_LABEL_WIDTH
    details_value_width = details_width - ROW_LABEL_WIDTH
    shipper_h = TITLE_BAR_HEIGHT + _rows_height(shipper_rows, shipper_value_width) + 1.5 * mm
    details_h = TITLE_BAR_HEIGHT + _rows_height(details_rows, details_value_width) + 1.5 * mm
    bottom_row_height = max(shipper_h, details_h)
    bottom_row_bottom = bottom_top - bottom_row_height

    shipper_content_top = _draw_box_frame(c, col1_x, bottom_row_bottom, shipper_width, bottom_row_height, "SHIPPER INFORMATION")
    _draw_rows(c, col1_x, shipper_content_top, shipper_value_width, shipper_rows)

    details_content_top = _draw_box_frame(c, details_x, bottom_row_bottom, details_width, bottom_row_height, "ORDER DETAILS")
    _draw_rows(c, details_x, details_content_top, details_value_width, details_rows)

    c.setFont("Helvetica", 5.5)
    c.setFillColor(GREY)
    c.drawCentredString(LABEL_WIDTH / 2, max(bottom_row_bottom - 3 * mm, LABEL_MARGIN), "Handle with care · Scan QR to track")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


# ---------------------------------------------------------------------------
# Operating expenses report
# ---------------------------------------------------------------------------

EXPENSE_CATEGORY_LABELS = {
    "salary": "Employee Salaries",
    "bills": "Bills",
    "travelling": "Travelling",
    "owner_expense": "Owner Expense",
    "utilities": "Utilities",
    "other": "Other",
}


def generate_expense_report_pdf(expenses: list[Expense], start: date | None, end: date | None) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 18 * mm

    period_label = (
        f"{start.strftime('%d %b %Y') if start else 'All time'} - "
        f"{end.strftime('%d %b %Y') if end else 'Present'}"
    )

    def draw_header():
        c.setFillColor(NAVY)
        c.rect(0, height - 26 * mm, width, 26 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-BoldOblique", 16)
        c.drawString(margin, height - 12 * mm, "ZUHA EXPRESS.")
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-BoldOblique", 8)
        c.drawString(margin, height - 17 * mm, "SMART LOGISTICS, POWERED BY AI")
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 13)
        c.drawRightString(width - margin, height - 12 * mm, "OPERATING EXPENSES REPORT")
        c.setFont("Helvetica", 9)
        c.drawRightString(width - margin, height - 18 * mm, period_label)

    def draw_table_header(top: float) -> float:
        c.setFillColor(LIGHT_GREY)
        c.rect(margin, top - 6 * mm, width - 2 * margin, 8 * mm, fill=1, stroke=0)
        c.setFillColor(GREY)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margin + 2 * mm, top - 3.5 * mm, "DATE")
        c.drawString(margin + 25 * mm, top - 3.5 * mm, "CATEGORY")
        c.drawString(margin + 65 * mm, top - 3.5 * mm, "TITLE / NOTES")
        c.drawRightString(width - margin - 2 * mm, top - 3.5 * mm, "AMOUNT")
        return top - 8 * mm

    total = sum(float(e.amount) for e in expenses)
    by_category: dict[str, float] = {}
    for e in expenses:
        by_category[e.category.value] = by_category.get(e.category.value, 0.0) + float(e.amount)

    draw_header()
    y = height - 26 * mm - 10 * mm

    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin, y, "SUMMARY BY CATEGORY")
    y -= 7 * mm

    col_width = (width - 2 * margin) / 3
    for i, (cat_key, cat_label) in enumerate(EXPENSE_CATEGORY_LABELS.items()):
        amount = by_category.get(cat_key, 0.0)
        cx = margin + (i % 3) * col_width
        cy = y - (i // 3) * 6 * mm
        c.setFillColor(GREY)
        c.setFont("Helvetica", 9)
        c.drawString(cx, cy, cat_label)
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(cx + col_width - 4 * mm, cy, f"PKR {amount:,.0f}")

    rows_used = -(-len(EXPENSE_CATEGORY_LABELS) // 3)
    y -= rows_used * 6 * mm + 5 * mm

    c.setStrokeColor(LIGHT_GREY)
    c.setLineWidth(1)
    c.line(margin, y, width - margin, y)
    y -= 9 * mm

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(margin, y, "TOTAL OPERATING EXPENSES")
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(width - margin, y, f"PKR {total:,.0f}")
    y -= 12 * mm

    y = draw_table_header(y)
    c.setFont("Helvetica", 8.5)
    row_h = 7 * mm

    for e in expenses:
        if y < margin + 15 * mm:
            c.showPage()
            draw_header()
            y = height - 26 * mm - 10 * mm
            y = draw_table_header(y)
            c.setFont("Helvetica", 8.5)

        c.setFillColor(colors.black)
        c.drawString(margin + 2 * mm, y - 4.5 * mm, e.expense_date.strftime("%d %b %Y"))
        c.drawString(margin + 25 * mm, y - 4.5 * mm, EXPENSE_CATEGORY_LABELS.get(e.category.value, e.category.value))
        title_text = e.title if not e.notes else f"{e.title} - {e.notes}"
        max_chars = 55
        if len(title_text) > max_chars:
            title_text = title_text[: max_chars - 3] + "..."
        c.drawString(margin + 65 * mm, y - 4.5 * mm, title_text)
        c.drawRightString(width - margin - 2 * mm, y - 4.5 * mm, f"PKR {float(e.amount):,.0f}")
        c.setStrokeColor(LIGHT_GREY)
        c.setLineWidth(0.5)
        c.line(margin, y - row_h, width - margin, y - row_h)
        y -= row_h

    if not expenses:
        c.setFillColor(GREY)
        c.setFont("Helvetica", 10)
        c.drawCentredString(width / 2, y - 10 * mm, "No expenses recorded for this period.")

    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, margin / 2, f"Generated by ZUHA Express on {date.today().strftime('%d %b %Y')}")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
