import React, { useState } from 'react';
import { FileText, Plus, Search, Filter, Download, ArrowRight, Printer, AlertTriangle, X, Trash2, CheckCircle2 } from 'lucide-react';
import { Quotation, Product, Customer, CompanySettings } from '../types';
import { formatFCFA, formatBags, formatDateFr, getQuoteStatusLabel } from '../utils/formatters';
import { generateQuotationPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface QuotationsViewProps {
  quotations: Quotation[];
  products: Product[];
  customers: Customer[];
  settings: CompanySettings;
  onRefresh: () => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  quotations,
  products,
  customers,
  settings,
  onRefresh,
  canEdit,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quoteToDelete, setQuoteToDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteQuotation(quoteToDelete.id);
      setQuoteToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du devis');
    } finally {
      setIsDeleting(false);
    }
  };

  // Modal create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Conversion modal
  const [convertingQuote, setConvertingQuote] = useState<Quotation | null>(null);
  const [deliveryType, setDeliveryType] = useState<'emporte_immediat' | 'a_livrer'>('emporte_immediat');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'mobile_money' | 'virement' | 'autre'>('especes');
  const [converting, setConverting] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('Clarisse Moukala (Commerciale)');

  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number; discount: number }[]>([
    { product_id: products[0]?.id || '', quantity: 100, unit_price: products[0]?.selling_price || 5200, discount: 0 },
  ]);

  const filtered = quotations.filter(q => {
    const matchesSearch =
      q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openNewQuote = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setCustomerId(customers[0]?.id || '');
    setDiscount(0);
    const p = products[0];
    setItems([{ product_id: p?.id || '', quantity: 100, unit_price: p?.selling_price || 5200, discount: 0 }]);
    setNotes("Validité de l'offre : 15 jours. Prix fermes hors déchargement chantier.");
    setCreatedBy('Clarisse Moukala (Commerciale)');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    const p = products[0];
    if (p) {
      setItems([...items, { product_id: p.id, quantity: 50, unit_price: p.selling_price, discount: 0 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      updated[index] = {
        ...updated[index],
        product_id: value,
        unit_price: prod ? prod.selling_price : updated[index].unit_price,
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const subtotalCalculated = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) - (Number(it.discount) || 0),
    0
  );
  const totalCalculated = Math.max(0, subtotalCalculated - Number(discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }
    setSaving(true);
    setErrorMsg('');

    try {
      await api.createQuotation({
        date,
        expiry_date: expiryDate,
        customer_id: customerId,
        items,
        discount: Number(discount),
        notes,
        created_by: createdBy,
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création du devis.');
    } finally {
      setSaving(false);
    }
  };

  const openConvertModal = (q: Quotation) => {
    setConvertingQuote(q);
    setDeliveryType('emporte_immediat');
    setPaidAmount(q.total_amount);
    setPaymentMethod('especes');
    setErrorMsg('');
  };

  const handleExecuteConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingQuote) return;

    setConverting(true);
    setErrorMsg('');

    try {
      await api.convertToSale(convertingQuote.id, {
        delivery_type: deliveryType,
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        created_by: 'Clarisse Moukala (Commerciale)',
      });

      setConvertingQuote(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la transformation du devis en vente.');
    } finally {
      setConverting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° Devis', 'Date', 'Validité', 'Client', 'Total Net (FCFA)', 'Statut', 'Réf Vente Convertie'];
    const rows = filtered.map(q => [
      q.quote_number,
      formatDateFr(q.date),
      formatDateFr(q.expiry_date),
      q.customer_name || '-',
      q.total_amount,
      q.status,
      q.converted_to_sale_id || '-',
    ]);
    exportToCSV('devis_commerciaux_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Édition & Suivi des Devis</h2>
          <p className="text-xs text-slate-500">
            Propositions commerciales pour particuliers et entreprises BTP. Sans impact sur les stocks avant accord client.
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
              onClick={openNewQuote}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouveau Devis
            </button>
          )}
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher N° devis, client..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({quotations.length})
          </button>
          <button
            onClick={() => setStatusFilter('envoye')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'envoye' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Envoyés
          </button>
          <button
            onClick={() => setStatusFilter('accepte')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'accepte' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acceptés
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Devis</th>
                <th className="py-3 px-4">Date Émission</th>
                <th className="py-3 px-4">Validité</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-center">Quantité Totale</th>
                <th className="py-3 px-4 text-right">Montant Total</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun devis trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map(q => {
                  const badge = getQuoteStatusLabel(q.status);
                  const totalBags = q.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quote_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(q.date)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(q.expiry_date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{q.customer_name}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {formatBags(totalBags)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(q.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status !== 'accepte' && canEdit && (
                            <button
                              onClick={() => openConvertModal(q)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors flex items-center gap-1"
                              title="Valider et transformer en vente et facture"
                            >
                              <span>Convertir</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => generateQuotationPDF(q, settings)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            title="Télécharger Devis PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setQuoteToDelete(q)}
                              title="Supprimer ce devis (Admin)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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

      {/* Modal New Quote */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Établir un Nouveau Devis Commercial</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date d'Émission *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date de Validité *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client Destinataire *</label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lignes du Devis</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un produit
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-2 text-xs"
                    >
                      <div className="w-full sm:flex-1">
                        <select
                          value={it.product_id}
                          onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {p.brand}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          min={1}
                          placeholder="Quantité"
                          value={it.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-right"
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <input
                          type="number"
                          min={1}
                          placeholder="Prix unitaire"
                          value={it.unit_price}
                          onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-right"
                        />
                      </div>
                      <div className="w-full sm:w-28 text-right font-mono font-bold text-slate-800">
                        {formatFCFA(it.quantity * it.unit_price)}
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Discount */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <span>Remise accordée :</span>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-right"
                  />
                  <span>FCFA</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-normal mr-2">TOTAL NET :</span>
                  <span className="text-base text-orange-600 font-mono font-bold">{formatFCFA(totalCalculated)}</span>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Conditions & Mentions Particulières</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Émettre le Devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conversion Modal */}
      {convertingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Transformer le Devis {convertingQuote.quote_number} en Vente
              </h3>
              <button onClick={() => setConvertingQuote(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteConvert} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                <p className="font-semibold">Montant Total du Devis : {formatFCFA(convertingQuote.total_amount)}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Client : {convertingQuote.customer_name}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mode d'Enlèvement *</label>
                <select
                  value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="emporte_immediat">Emporté Immédiat (Déstockage instantané)</option>
                  <option value="a_livrer">À Livrer Ultérieurement (Réservation de stock)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Acompte / Payé (FCFA) *</label>
                  <input
                    type="number"
                    min={0}
                    max={convertingQuote.total_amount}
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode de Paiement *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="especes">Espèces</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="virement">Virement</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Cette opération va générer automatiquement la facture officielle correspondante et déduire ou réserver les sacs dans le stock.
              </p>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertingQuote(null)}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {converting ? 'Conversion en cours...' : 'Confirmer la Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      <ConfirmDeleteModal
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={handleDeleteQuote}
        title="Supprimer le devis"
        itemDescription={quoteToDelete ? `${quoteToDelete.quote_number} - ${quoteToDelete.customer_name} (${formatFCFA(quoteToDelete.total_amount)})` : ''}
        warningNote="La suppression de ce devis l'effacera de la base de données. Les devis n'impactent pas les stocks physiques. Réservé à l'administrateur."
        isDeleting={isDeleting}
      />
    </div>
  );
};
