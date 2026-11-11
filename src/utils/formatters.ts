/**
 * Utilitaires de formatage monétaire et temporel pour Gestion Dépôt Ciment
 * Fuseau horaire: Africa/Brazzaville
 * Devise: FCFA (XAF)
 */

export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 FCFA';
  }
  const formatted = Math.round(amount).toLocaleString('fr-FR');
  return `${formatted} FCFA`;
}

export function formatBags(count: number | null | undefined): string {
  if (count === null || count === undefined || isNaN(count)) {
    return '0 sac';
  }
  const formatted = Math.round(count).toLocaleString('fr-FR');
  return `${formatted} ${count > 1 ? 'sacs' : 'sac'}`;
}

export function formatDateFr(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Brazzaville',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTimeFr(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Brazzaville',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getPaymentStatusLabel(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'payee':
      return { label: 'Payée', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'partielle':
      return { label: 'Partiellement payée', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    case 'impayee':
      return { label: 'Impayée (Créance)', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700' };
  }
}

export function getDeliveryStatusLabel(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'livree':
      return { label: 'Livrée', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'partielle':
      return { label: 'Partiellement livrée', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    case 'en_attente':
      return { label: 'En attente', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' };
    case 'annulee':
      return { label: 'Annulée', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700' };
  }
}

export function getQuoteStatusLabel(status: string): { label: string; bg: string } {
  switch (status) {
    case 'brouillon':
      return { label: 'Brouillon', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'envoye':
      return { label: 'Envoyé au client', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'accepte':
      return { label: 'Accepté / Validé', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'refuse':
      return { label: 'Refusé', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'expire':
      return { label: 'Expiré', bg: 'bg-slate-200 text-slate-600 border-slate-300' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}
