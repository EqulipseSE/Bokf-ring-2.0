export type InvoiceAmountLine = {
  unitPrice: string;
  quantity: string;
  vatCode: string;
};

export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function lineOre(unitPrice: string, quantity: string): number | null {
  const price = parseAmount(unitPrice);
  const count = parseAmount(quantity);
  if (price === null || count === null) return null;
  return Math.round(price * count * 100);
}

export function formatOre(ore: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ore / 100);
}

export function vatRate(code: string): number {
  if (code === "U25" || code === "I25") return 0.25;
  if (code === "U12" || code === "I12") return 0.12;
  if (code === "U6" || code === "I6") return 0.06;
  return 0;
}

function chargeOre(amount: string, includingVat: boolean) {
  const parsed = parseAmount(amount);
  if (parsed === null || parsed === 0) return { net: 0, vat: 0, gross: 0 };
  const ore = Math.round(parsed * 100);
  if (includingVat) {
    const net = Math.round(ore / 1.25);
    return { net, vat: ore - net, gross: ore };
  }
  const vat = Math.round(ore * 0.25);
  return { net: ore, vat, gross: ore + vat };
}

export function invoiceAmounts(
  lines: InvoiceAmountLine[],
  includingVat: boolean,
  freight: string,
  invoiceFee: string
) {
  let net = 0;
  let vat = 0;
  let gross = 0;
  let any = false;
  for (const line of lines) {
    const ore = lineOre(line.unitPrice, line.quantity);
    if (ore === null) continue;
    any = true;
    const rate = vatRate(line.vatCode);
    if (includingVat) {
      const lineNet = Math.round(ore / (1 + rate));
      net += lineNet;
      vat += ore - lineNet;
      gross += ore;
    } else {
      const lineVat = Math.round(ore * rate);
      net += ore;
      vat += lineVat;
      gross += ore + lineVat;
    }
  }
  for (const amount of [freight, invoiceFee]) {
    const charge = chargeOre(amount, includingVat);
    if (charge.gross === 0 && charge.net === 0) continue;
    any = true;
    net += charge.net;
    vat += charge.vat;
    gross += charge.gross;
  }
  if (!any) {
    return {
      net: "",
      vat: "",
      gross: "",
      rounding: "",
      total: "",
      netOre: 0,
      vatOre: 0,
      grossOre: 0,
      roundingOre: 0,
      totalOre: 0,
    };
  }
  const sign = gross < 0 ? -1 : 1;
  const rounded = sign * Math.round(Math.abs(gross) / 100) * 100;
  return {
    net: formatOre(net),
    vat: formatOre(vat),
    gross: formatOre(gross),
    rounding: formatOre(rounded - gross),
    total: formatOre(rounded),
    netOre: net,
    vatOre: vat,
    grossOre: gross,
    roundingOre: rounded - gross,
    totalOre: rounded,
  };
}
