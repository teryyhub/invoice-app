export const formatCurrency = (amount: number, currency = "USD"): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));

export const generateInvoiceNumber = (prefix = "INV"): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

export const calculateInvoiceTotals = (items: { quantity: number; unit_price: number }[], taxRate = 0) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
};
