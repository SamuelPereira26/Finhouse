export function monthFromOffset(offset = 0): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
