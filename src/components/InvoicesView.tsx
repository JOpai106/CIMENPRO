import React, { useState } from 'react';
import { CreditCard, Search, Filter, Download, Printer, AlertTriangle, X, Ban, DollarSign, Trash2 } from 'lucide-react';
import { Invoice, CompanySettings } from '../types';
import { formatFCFA, formatDateFr, getPaymentStatusLabel } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  settings: CompanySettings;
  onRefresh: () => void;
  onPayInvoice: (invoice: Invoice) => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  settings,
  onRefresh,
  onPayInvoice,
  canEdit,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de la facture');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel modal
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = invoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.sale_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === 'ALL' || inv.payment_status === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingInvoice) return;
    if (!cancelReason.trim()) {
      setErrorMsg("Veuillez indiquer un motif d'annulation motivé.");
      return;
    }

    setSavingCancel(true);
    setErrorMsg('');

    try {
      await api.cancelInvoice(cancellingInvoice.id, cancelReason, 'Administrateur');
      setCancellingInvoice(null);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'annulation de la facture.");
    } finally {
      setSavingCancel(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'N° Facture',
      'Date',
      'Échéance',
      'Réf. Vente',
      'Client',
      'Total Net (FCFA)',
      'Déjà Payé (FCFA)',
      'Solde Dû (FCFA)',
      'Statut Paiement',
      'État Facture',
    ];
    const rows = filtered.map(inv => [
      inv.invoice_number,
      formatDateFr(inv.date),
      formatDateFr(inv.due_date),
      inv.sale_number || '-',
      inv.customer_name || '-',
      inv.total_amount,
      inv.paid_amount,
      inv.remaining_amount,
      inv.payment_status,
      inv.status,
    ]);
    exportToCSV('factures_clients_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Facturation Commerciale</h2>
          <p className="text-xs text-slate-500">
            Factures définitives de vente, suivi des échéances, encaissements échelonnés et traçabilité des annulations.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter CSV
        </button>
      </div>

      {/* Filter and search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher N° facture, client..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium w-full sm:w-auto">
          <button
            onClick={() => setPaymentFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              paymentFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({invoices.length})
          </button>
          <button
            onClick={() => setPaymentFilter('payee')}
            className={`px-3 py-1 rounded-md transition-colors ${
              paymentFilter === 'payee' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payées
          </button>
          <button
            onClick={() => setPaymentFilter('partielle')}
            className={`px-3 py-1 rounded-md transition-colors ${
              paymentFilter === 'partielle' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partielles
          </button>
          <button
            onClick={() => setPaymentFilter('impayee')}
            className={`px-3 py-1 rounded-md transition-colors ${
              paymentFilter === 'impayee' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Créances
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Facture</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Montant Total</th>
                <th className="py-3 px-4 text-right">Déjà Réglé</th>
                <th className="py-3 px-4 text-right">Reste Dû</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const payBadge = getPaymentStatusLabel(inv.payment_status);
                  const isCancelled = inv.status === 'annulee';

                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                        {isCancelled && (
                          <span className="block text-[9px] text-rose-600 font-sans font-bold uppercase">Annulée</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(inv.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.customer_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatFCFA(inv.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {inv.remaining_amount > 0 ? (
                          <span className="text-rose-600">{formatFCFA(inv.remaining_amount)}</span>
                        ) : (
                          <span className="text-slate-400">0 FCFA</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${payBadge.bg}`}>
                          {payBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCancelled && inv.remaining_amount > 0 && canEdit && (
                            <button
                              onClick={() => onPayInvoice(inv)}
                              className="px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors flex items-center gap-1"
                              title="Encaisser un versement sur cette facture"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Encaisser</span>
                            </button>
                          )}

                          <button
                            onClick={() => generateInvoicePDF(inv, settings)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            title="Imprimer / Télécharger Facture PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && canEdit && (
                            <button
                              onClick={() => setCancellingInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                              title="Procédure d'annulation motivée"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Supprimer cette facture (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Invoice Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Annulation Motivée de la Facture {cancellingInvoice.invoice_number}
              </h3>
              <button onClick={() => setCancellingInvoice(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-slate-600">
                Conformément aux règles de contrôle comptable, une facture ne peut être supprimée de la base de données. Elle sera archivée comme "Annulée" et tracée dans le journal d'audit.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif de l'annulation *</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ex: Erreur de saisie client, commande révisée avant livraison..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingInvoice(null)}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={savingCancel}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {savingCancel ? 'Annulation...' : "Confirmer l'Annulation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      <ConfirmDeleteModal
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleDeleteInvoice}
        title="Supprimer la facture"
        itemDescription={invoiceToDelete ? `${invoiceToDelete.invoice_number} - ${invoiceToDelete.customer_name} (${formatFCFA(invoiceToDelete.total_amount)})` : ''}
        warningNote="La suppression de cette facture supprimera le document comptable et ses règlements associés. Réservé à l'administrateur."
        isDeleting={isDeleting}
      />
    </div>
  );
};
