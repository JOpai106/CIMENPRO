import React, { useState } from 'react';
import { ClipboardCheck, Plus, Download, AlertTriangle, X, CheckCircle, RefreshCw } from 'lucide-react';
import { InventoryAdjustment, Product } from '../types';
import { formatBags, formatDateFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface InventoryViewProps {
  adjustments: InventoryAdjustment[];
  products: Product[];
  onRefresh: () => void;
  canEdit: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  adjustments,
  products,
  onRefresh,
  canEdit,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [physicalStock, setPhysicalStock] = useState<number>(products[0]?.current_stock || 0);
  const [reason, setReason] = useState('');
  const [validatedBy, setValidatedBy] = useState('Alain Mabiala (Directeur)');
  const [createdBy, setCreatedBy] = useState('Gérard Okemba (Gestionnaire Stock)');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const theoreticalStock = selectedProduct ? selectedProduct.current_stock : 0;
  const discrepancy = physicalStock - theoreticalStock;

  const openNewAdjustment = (p?: Product) => {
    const prod = p || products[0];
    if (prod) {
      setSelectedProductId(prod.id);
      setPhysicalStock(prod.current_stock);
    }
    setReason('');
    setValidatedBy('Alain Mabiala (Directeur)');
    setCreatedBy('Gérard Okemba (Gestionnaire Stock)');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleProductSelect = (pid: string) => {
    setSelectedProductId(pid);
    const prod = products.find(p => p.id === pid);
    if (prod) {
      setPhysicalStock(prod.current_stock);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Veuillez renseigner le motif explicatif de l'écart de stock.");
      return;
    }
    if (discrepancy === 0) {
      setErrorMsg('Aucun écart constaté entre le stock théorique et physique.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.createInventoryAdjustment({
        product_id: selectedProductId,
        physical_stock: Number(physicalStock),
        reason,
        validated_by: validatedBy,
        created_by: createdBy,
      });

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la régularisation d'inventaire.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° Ajustement', 'Date', 'Code Produit', 'Produit', 'Stock Théorique', 'Stock Physique', 'Écart Constaté', 'Motif', 'Validateur', 'Opérateur'];
    const rows = adjustments.map(a => [
      a.adjustment_number,
      formatDateFr(a.date),
      a.product_code || '-',
      a.product_name || '-',
      a.theoretical_stock,
      a.physical_stock,
      a.discrepancy,
      a.reason,
      a.validated_by,
      a.created_by,
    ]);
    exportToCSV('ajustements_inventaire_physique_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Inventaire Physique & Régularisations</h2>
          <p className="text-xs text-slate-500">
            Comparaison entre le stock théorique calculé et le comptage physique dans le hangar, avec génération de mouvements traçables.
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
              onClick={() => openNewAdjustment()}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Saisir un Comptage
            </button>
          )}
        </div>
      </div>

      {/* Grid of Current Product Stocks with Quick Adjust button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          État des Références pour Inventaire
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {products.map(p => (
            <div
              key={p.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-slate-900 block">{p.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {p.brand} · Stock théorique: {p.current_stock} sacs
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => openNewAdjustment(p)}
                  className="px-2 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-800 shadow-2xs"
                >
                  Inventoriez
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adjustments History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Historique des Écarts & Ajustements Validés
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Pièce</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Produit</th>
                <th className="py-3 px-4 text-right">Stock Théorique</th>
                <th className="py-3 px-4 text-right">Stock Physique</th>
                <th className="py-3 px-4 text-right font-bold">Écart</th>
                <th className="py-3 px-4">Motif Constaté</th>
                <th className="py-3 px-4">Validé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Aucun ajustement d'inventaire enregistré.
                  </td>
                </tr>
              ) : (
                adjustments.map(a => {
                  const isPlus = a.discrepancy > 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{a.adjustment_number}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDateFr(a.date)}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-800">{a.product_name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{a.theoretical_stock} sacs</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{a.physical_stock} sacs</td>
                      <td className={`py-3 px-4 text-right font-bold text-sm ${isPlus ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPlus ? '+' : ''}{a.discrepancy} sacs
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 text-[11px] max-w-xs truncate">{a.reason}</td>
                      <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">{a.validated_by}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saisie Comptage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Saisie du Comptage Physique</h3>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Produit de Ciment *</label>
                <select
                  value={selectedProductId}
                  onChange={e => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.brand} (Théorique: {p.current_stock} sacs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Stock Théorique</span>
                  <span className="text-base font-bold font-mono text-slate-800">{theoreticalStock} sacs</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Physique Compté *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={physicalStock}
                    onChange={e => setPhysicalStock(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-base focus:ring-1 focus:ring-orange-500 text-right"
                  />
                </div>
              </div>

              {/* Discrepancy indicator */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  discrepancy === 0
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : discrepancy > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>Écart calculé :</span>
                <span className="font-mono text-sm">
                  {discrepancy > 0 ? `+${discrepancy}` : discrepancy} sacs
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif de l'Écart Constaté *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: 5 sacs endommagés par humidité pluie, régularisation déchargement..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Superviseur Validateur *</label>
                  <input
                    type="text"
                    required
                    value={validatedBy}
                    onChange={e => setValidatedBy(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsable Inventaire *</label>
                  <input
                    type="text"
                    required
                    value={createdBy}
                    onChange={e => setCreatedBy(e.target.value)}
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
                  disabled={saving || discrepancy === 0}
                  className="px-4 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Régularisation...' : 'Valider & Ajuster le Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
