// src/shared/utils/formatDate.ts

export function formatDate(date: string | Date): string {
  const d = new Date(date);

  // Verifica se a data é inválida
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}
