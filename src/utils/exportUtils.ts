/**
 * Utilitaires d'export CSV / Excel avec encodage UTF-8 BOM
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Add UTF-8 Byte Order Mark (BOM) so Excel opens accents correctly
  const BOM = '\uFEFF';
  
  const escapeCell = (cell: string | number) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvContent =
    BOM +
    [
      headers.map(escapeCell).join(';'),
      ...rows.map(row => row.map(escapeCell).join(';')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
