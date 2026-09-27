export type BookPriceValue = number | string | null | undefined;

function parsePrice(value: BookPriceValue) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;

  const raw = value.trim().replace(/\s/g, '');
  if (!raw) return null;
  const normalized =
    raw.includes(',') && raw.includes('.')
      ? raw.lastIndexOf(',') > raw.lastIndexOf('.')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/,/g, '')
      : raw.includes(',')
        ? raw.replace(',', '.')
        : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatBookPrice(value: BookPriceValue): string | null {
  const price = parsePrice(value);
  if (price === null) return null;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(price)} đ`;
}
