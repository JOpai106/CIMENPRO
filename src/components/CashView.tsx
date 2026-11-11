import React, { useState } from 'react';
import { Wallet, Plus, Search, Filter, Download, Printer, CreditCard, ArrowDownRight, ArrowUpRight, AlertTriangle, X } from 'lucide-react';
import { Payment, CashTransaction, Invoice, Customer, CompanySettings } from '../types';
import { formatFCFA, formatDateFr, formatDateTimeFr } from '../utils/formatters';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface CashViewProps {
  payments: Payment[];
  cashFlow: { total_balance: number; by_method: any[]; transactions: any[] } | null;
  invoices: Invoice[];
  customers: Customer[];
  settings: CompanySettings;
  onRefresh: () => void;
  canEdit: boolean;
  preselectedInvoice?: Invoice | null;
  onClearPreselected?: () => void;
}

export const CashView: React.FC<CashViewProps> = ({
  payments,
  cashFlow,
  invoices,
  customers,
  settings,
  onRefresh,
  canEdit,
  preselectedInvoice,
  onClearPreselected,
}) => {
  const [activeTab, setActiveTab] = useState<'receipts' | 'transactions'>('receipts');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Modal payment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedInvoice?.customer_id || customers[0]?.id || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preselectedInvoice?.id || '');
  const [amount, setAmount] = useState<number>(preselectedInvoice?.remaining_amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'mobile_money' | 'virement' | 'autre'>('especes');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('Arlette Ngoma (Caissière)');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle preselected invoice from other views
  React.useEffect(() => {
    if (preselectedInvoice) {
      setSelectedCustomerId(preselectedInvoice.customer_id);
      setSelectedInvoiceId(preselectedInvoice.id);
      setAmount(preselectedInvoice.remaining_amount);
      setIsModalOpen(true);
    }
  }, [preselectedInvoice]);

  // Customer unpaid invoices
  const customerUnpaidInvoices = invoices.filter(
    inv => inv.customer_id === selectedCustomerId && inv.remaining_amount > 0 && inv.status === 'validee'
  );

  const openNewPayment = () => {
    const cust = customers[0];
    setSelectedCustomerId(cust?.id || '');
    const firstInv = invoices.find(i => i.customer_id === cust?.id && i.remaining_amount > 0);
    setSelectedInvoiceId(firstInv?.id || '');
    setAmount(firstInv?.remaining_amount || 0);
    setPaymentMethod('especes');
    setTransactionRef('');
    setNotes('');
    setCreatedBy('Arlette Ngoma (Caissière)');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCustomerChange = (cid: string) => {
    setSelectedCustomerId(cid);
    const firstInv = invoices.find(i => i.customer_id === cid && i.remaining_amount > 0);
    setSelectedInvoiceId(firstInv?.id || '');
    setAmount(firstInv?.remaining_amount || 0);
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setAmount(inv.remaining_amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }
    if (!selectedInvoiceId) {
      setErrorMsg('Veuillez sélectionner la facture à régler.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Le montant doit être supérieur à 0 FCFA.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await api.createPayment({
        customer_id: selectedCustomerId,
        invoice_id: selectedInvoiceId,
        amount: Number(amount),
        payment_method: paymentMethod,
        transaction_ref: transactionRef,
        notes,
        created_by: createdBy,
      });

      setIsModalOpen(false);
      if (onClearPreselected) onClearPreselected();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement de l'encaissement.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch =
      p.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const getBalanceFor = (method: string) => {
    if (!cashFlow || !cashFlow.by_method) return 0;
    const item = cashFlow.by_method.find(m => m.payment_method === method);
    return item ? item.balance : 0;
  };

  const handleExportCSV = () => {
    const headers = ['N° Reçu', 'Date', 'Client', 'Facture', 'Montant Encaissé (FCFA)', 'Mode', 'Réf. Transaction', 'Caissier'];
    const rows = filteredPayments.map(p => [
      p.payment_number,
      formatDateFr(p.date),
      p.customer_name || '-',
      p.invoice_number || '-',
      p.amount,
      p.payment_method,
      p.transaction_ref || '-',
      p.created_by,
    ]);
    exportToCSV('recettes_caisse_depot_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recettes & Caisse en Temps Réel</h2>
          <p className="text-xs text-slate-500">
            Suivi des encaissements effectifs, gestion des règlements partiels et solde de trésorerie disponible.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
          {canEdit && (
            <button
              onClick={openNewPayment}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouvel Encaissement
            </button>
          )}
        </div>
      </div>

      {/* Cash Balances by Payment Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Solde Global Caisse</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
            {formatFCFA(cashFlow?.total_balance || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total espèces + mobile money + virement
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Espèces (Tiroir Caisse)</span>
            <DollarSignIcon className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {formatFCFA(getBalanceFor('especes'))}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Guichet comptoir dépôt
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Mobile Money (MoMo / Airtel)</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {formatFCFA(getBalanceFor('mobile_money'))}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Comptes marchands dépôt
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Virement Bancaire</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {formatFCFA(getBalanceFor('virement'))}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Compte bancaire BGFI / LCB
          </div>
        </div>
      </div>

      {/* Tabs: Reçus d'encaissement vs Flux de Caisse complet */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'receipts'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Reçus d'Encaissement ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Journal des Entrées / Sorties Caisse
          </button>
        </div>

        {activeTab === 'receipts' && (
          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">Tous les modes</option>
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Receipts Table */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">N° Reçu</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Facture Rattachée</th>
                  <th className="py-3 px-4">Mode Règlement</th>
                  <th className="py-3 px-4 text-right">Montant Encaissé</th>
                  <th className="py-3 px-4">Caissier(ère)</th>
                  <th className="py-3 px-4 text-right">Reçu de Caisse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Aucun versement enregistré.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(p.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.invoice_number || p.sale_number || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 uppercase text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {p.payment_method}
                        </span>
                        {p.transaction_ref && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Réf: {p.transaction_ref}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                        +{formatFCFA(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{p.created_by}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => generatePaymentReceiptPDF(p, settings)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          title="Imprimer Reçu de Caisse A5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Reçu A5</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: All Cash Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type Opération</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Réf. Pièce</th>
                  <th className="py-3 px-4">Motif / Description</th>
                  <th className="py-3 px-4 text-right">Mouvement Caisse</th>
                  <th className="py-3 px-4">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(!cashFlow || cashFlow.transactions.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      Aucune transaction de caisse.
                    </td>
                  </tr>
                ) : (
                  cashFlow.transactions.map((t: any) => {
                    const isPositive = t.amount >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-slate-600">{formatDateFr(t.date)}</td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] text-slate-700">{t.payment_method}</td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">{t.reference_number || t.reference_id || '-'}</td>
                        <td className="py-3 px-4 font-sans text-slate-600 text-[11px] max-w-xs truncate">{t.notes || '-'}</td>
                        <td className={`py-3 px-4 text-right font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{formatFCFA(t.amount)}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">{t.created_by}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Enregistrer un Encaissement de Facture
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onClearPreselected) onClearPreselected();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Débiteur *</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facture en Souffrance à Régler *</label>
                {customerUnpaidInvoices.length === 0 ? (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    Ce client n'a aucune facture impayée en attente.
                  </p>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={e => handleInvoiceChange(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 font-mono"
                  >
                    {customerUnpaidInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} (Reste dû : {formatFCFA(inv.remaining_amount)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant Encaissé (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode de Règlement *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="especes">Espèces (Guichet)</option>
                    <option value="mobile_money">Mobile Money (MoMo/Airtel)</option>
                    <option value="virement">Virement Bancaire</option>
                    <option value="autre">Chèque / Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Réf. Transaction / Reçu Bancaire</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="Ex: MOMO-TX-99812 ou VIR-BGFI-001"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observations / Remarques</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Règlement acompte 2e tranche coulage..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onClearPreselected) onClearPreselected();
                  }}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || customerUnpaidInvoices.length === 0}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Validation...' : 'Valider & Émettre Reçu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple dollar icon helper
function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8c-1.11 0-2.08-.402-2.599-1M12 16v2" />
    </svg>
  );
}
