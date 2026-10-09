function scaled(value: string, decimals: number): bigint {
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(value)) return BigInt(0);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

function roundedDivide(value: bigint, divisor: bigint): bigint {
  return (value + divisor / BigInt(2)) / divisor;
}

export function formatCents(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  return `${negative ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

export function calculateInvoiceAmounts(form: {
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  withholdingRate: string;
}) {
  const amount = roundedDivide(scaled(form.quantity, 4) * scaled(form.unitPrice, 4), BigInt(1_000_000));
  const discount = scaled(form.discount, 2);
  const taxable = amount > discount ? amount - discount : BigInt(0);
  const tax = roundedDivide(taxable * scaled(form.taxRate, 4), BigInt(10_000));
  const withholding = roundedDivide(taxable * scaled(form.withholdingRate, 4), BigInt(10_000));
  return { amount, discount, tax, withholding, total: taxable + tax - withholding };
}
