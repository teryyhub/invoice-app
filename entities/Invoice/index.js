export const InvoiceStatus = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
};

export const defaultInvoice = {
  invoice_number: "",
  status: InvoiceStatus.DRAFT,
  issue_date: new Date().toISOString().split("T")[0],
  due_date: "",
  subtotal: 0,
  tax_rate: 0,
  tax_amount: 0,
  total: 0,
  notes: "",
  items: [],
};
