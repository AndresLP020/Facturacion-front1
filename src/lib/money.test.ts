import { describe, expect, it } from "vitest";
import { calculateInvoiceAmounts, formatCents } from "./money";

describe("safe invoice amount calculations", () => {
  it("calculates subtotal, simulated tax, withholding, and total in cents", () => {
    const result = calculateInvoiceAmounts({
      quantity: "2",
      unitPrice: "10.25",
      discount: "1.00",
      taxRate: "0.16",
      withholdingRate: "0.01",
    });

    expect(formatCents(result.amount)).toBe("20.50");
    expect(formatCents(result.discount)).toBe("1.00");
    expect(formatCents(result.tax)).toBe("3.12");
    expect(formatCents(result.withholding)).toBe("0.20");
    expect(formatCents(result.total)).toBe("22.42");
  });

  it("does not interpret malformed numeric strings as amounts", () => {
    const result = calculateInvoiceAmounts({
      quantity: "1e3",
      unitPrice: "99.99",
      discount: "0",
      taxRate: "0.16",
      withholdingRate: "0",
    });

    expect(result.amount).toBe(BigInt(0));
    expect(formatCents(result.total)).toBe("0.00");
  });
});
