import React, { useState } from 'react';
import { Truck, Plus, Search, FileText, Download, AlertTriangle, X, Trash2, Printer } from 'lucide-react';
import { Purchase, Product, Supplier, CompanySettings } from '../types';
import { formatFCFA, formatBags, formatDateFr } from '../utils/formatters';
import { generatePurchaseReceiptPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface PurchasesViewProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  settings: CompanySettings;
  onRefresh: () => void;
  canEdit: boolean;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  products,
  suppliers,
  settings,
  onRefresh,
  canEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('Gérard Okemba (Gestionnaire Stock)');
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([
    { product_id: products[0]?.id || '', quantity: 500, unit_price: products[0]?.purchase_price || 4600 },
  ]);

  const filtered = purchases.filter(p => {
    return (
      p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_invoice_ref.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const openNewModal = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSupplierId(suppliers[0]?.id || '');
    setSupplierInvoiceRef(`BL-FOURN-${Date.now().toString().slice(-4)}`);
    setNotes('');
    setCreatedBy('Gérard Okemba (Gestionnaire Stock)');
    setItems([
      { product_id: products[0]?.id || '', quantity: 600, unit_price: products[0]?.purchase_price || 4600 },
    ]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    if (firstProd) {
      setItems([...items, { product_id: firstProd.id, quantity: 200, unit_price: firstProd.purchase_price }]);
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
        unit_price: prod ? prod.purchase_price : updated[index].unit_price,
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const totalCalculated = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (!supplierInvoiceRef.trim()) {
      setErrorMsg('Veuillez renseigner le numéro du bon de livraison fournisseur.');
      return;
    }
    if (items.some(it => !it.product_id || it.quantity <= 0 || it.unit_price <= 0)) {
      setErrorMsg('Tous les articles doivent avoir un produit, une quantité (>0) et un prix unitaire (>0).');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.createPurchase({
        date,
        supplier_id: supplierId,
        supplier_invoice_ref: supplierInvoiceRef,
        items,
        notes,
        created_by: createdBy,
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la validation de la réception.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° Réception', 'Date', 'Fournisseur', 'Réf. BL Fournisseur', 'Montant Total (FCFA)', 'Statut', 'Responsable'];
    const rows = filtered.map(p => [
      p.purchase_number,
      formatDateFr(p.date),
      p.supplier_name || '-',
      p.supplier_invoice_ref,
      p.total_amount,
      p.status,
      p.created_by,
    ]);
    exportToCSV('approvisionnements_receptions_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Approvisionnements & Réceptions Usine</h2>
          <p className="text-xs text-slate-500">
            Enregistrement des bons de livraison fournisseurs et réapprovisionnement automatique du stock en sacs.
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
              onClick={openNewModal}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Réception
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher N° BR, fournisseur, réf BL..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Réception</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Réf. BL Fournisseur</th>
                <th className="py-3 px-4 text-center">Produits & Sacs</th>
                <th className="py-3 px-4 text-right">Montant Total</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-right">Bon de Réception</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune réception enregistrée.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const totalBags = (p.items || []).reduce((acc, it) => acc + it.quantity, 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.purchase_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(p.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.supplier_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.supplier_invoice_ref}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-slate-800">{formatBags(totalBags)}</span>
                        <span className="block text-[10px] text-slate-500 font-sans">
                          {p.items?.length || 0} référence(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(p.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{p.created_by}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => generatePurchaseReceiptPDF(p, settings)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          title="Télécharger Bon de Réception PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal New Reception */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Enregistrer une Réception d'Approvisionnement Usine
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
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
                  <label className="block font-semibold text-slate-700 mb-1">Date de Réception *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fournisseur Usine *</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Réf. Bon de Livraison Usine *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceRef}
                    onChange={e => setSupplierInvoiceRef(e.target.value)}
                    placeholder="Ex: BL-CIMAF-1092"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Lignes des Sacs Réceptionnés
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => {
                    const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-2 text-xs"
                      >
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Produit
                          </label>
                          <select
                            value={it.product_id}
                            onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.brand})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Qté (Sacs)
                          </label>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sacs"
                            value={it.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-right"
                          />
                        </div>

                        <div className="w-full sm:w-36">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Prix Achat Unit.
                          </label>
                          <input
                            type="number"
                            min={1}
                            placeholder="Prix unitaire"
                            value={it.unit_price}
                            onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-right"
                          />
                        </div>

                        <div className="w-full sm:w-32 text-right font-mono font-bold text-slate-800">
                          {formatFCFA(lineTotal)}
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-xs font-bold text-slate-900">
                <span>TOTAL APPROVISIONNEMENT :</span>
                <span className="text-base text-orange-600 font-mono">{formatFCFA(totalCalculated)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsable Réception</label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={e => setCreatedBy(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Observations / Numéro Camion</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Semi-remorque 30 tonnes, déchargement dockers..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
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
                  {saving ? 'Validation & Incrément Stock...' : 'Valider la Réception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
