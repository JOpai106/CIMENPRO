import React, { useState } from 'react';
import { Receipt, Plus, Search, Filter, Download, AlertTriangle, X } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface ExpensesViewProps {
  expenses: Expense[];
  onRefresh: () => void;
  canEdit: boolean;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onRefresh,
  canEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('carburant');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(25000);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'mobile_money' | 'virement' | 'autre'>('especes');
  const [receiptRef, setReceiptRef] = useState('');
  const [approvedBy, setApprovedBy] = useState('Alain Mabiala (Directeur)');
  const [createdBy, setCreatedBy] = useState('Arlette Ngoma (Caissière)');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categoryLabels: Record<ExpenseCategory, string> = {
    carburant: 'Carburant Camions',
    manutention_dechargement: 'Manutention & Déchargement Dockers',
    salaires: 'Salaires & Primes Équipe',
    loyer: 'Loyer Hangar Dépôt',
    entretien_vehicule: 'Entretien & Réparations Véhicules',
    electricite_eau: 'Électricité & Eau',
    divers: 'Fournitures & Divers',
  };

  const filtered = expenses.filter(e => {
    const matchesSearch =
      e.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.receipt_ref || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  const openNewExpense = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('carburant');
    setDescription('');
    setAmount(35000);
    setPaymentMethod('especes');
    setReceiptRef(`TICK-${Date.now().toString().slice(-4)}`);
    setApprovedBy('Alain Mabiala (Directeur)');
    setCreatedBy('Arlette Ngoma (Caissière)');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Veuillez décrire le motif de la dépense.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Le montant doit être supérieur à 0 FCFA.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.createExpense({
        date,
        category,
        description,
        amount: Number(amount),
        payment_method: paymentMethod,
        receipt_ref: receiptRef,
        approved_by: approvedBy,
        created_by: createdBy,
      });

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement de la dépense.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° Dépense', 'Date', 'Catégorie', 'Motif', 'Montant (FCFA)', 'Mode Règlement', 'Justificatif', 'Approbateur'];
    const rows = filtered.map(e => [
      e.expense_number,
      formatDateFr(e.date),
      categoryLabels[e.category] || e.category,
      e.description,
      e.amount,
      e.payment_method,
      e.receipt_ref || '-',
      e.approved_by || '-',
    ]);
    exportToCSV('depenses_depot_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Dépenses & Charges du Dépôt</h2>
          <p className="text-xs text-slate-500">
            Enregistrement des frais de manutention, gasoil pour rotations de camions, primes et entretien du dépôt.
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
              onClick={openNewExpense}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Dépense
            </button>
          )}
        </div>
      </div>

      {/* Filter and summary bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher description, justificatif..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
          >
            <option value="ALL">Toutes les catégories</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase">Total décaissé</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatFCFA(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Dépense</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Nature / Catégorie</th>
                <th className="py-3 px-4">Motif & Justification</th>
                <th className="py-3 px-4">Mode Règlement</th>
                <th className="py-3 px-4">Justificatif</th>
                <th className="py-3 px-4 text-right">Montant Décaissé</th>
                <th className="py-3 px-4">Approuvé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.expense_number}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(e.date)}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {categoryLabels[e.category] || e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{e.description}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-600">
                      {e.payment_method}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{e.receipt_ref || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      -{formatFCFA(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{e.approved_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Enregistrer une Dépense du Dépôt</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie de Charge *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif / Description Détaillée *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Déchargement semi-remorque usine 600 sacs (dockers)..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant Décaissé (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode de Paiement *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="especes">Espèces (Caisse)</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="virement">Virement</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Réf. Ticket / Reçu</label>
                  <input
                    type="text"
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    placeholder="Ex: TICK-STATION-12"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Approuvé par *</label>
                  <input
                    type="text"
                    required
                    value={approvedBy}
                    onChange={e => setApprovedBy(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Valider la Dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
