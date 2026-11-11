import React, { useState } from 'react';
import { Layers, Search, Filter, Download, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { StockMovement } from '../types';
import { formatBags, formatFCFA, formatDateFr, formatDateTimeFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';

interface StockMovementsViewProps {
  movements: StockMovement[];
  onRefresh: () => void;
}

export const StockMovementsView: React.FC<StockMovementsViewProps> = ({
  movements,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = movements.filter(m => {
    const matchesSearch =
      (m.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.product_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.reference_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.created_by || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || m.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
    const headers = ['Date', 'Heure', 'Code Produit', 'Produit', 'Type Mouvement', 'Quantité', 'Stock Avant', 'Stock Après', 'Prix Unitaire', 'Réf. Pièce', 'Opérateur', 'Motif'];
    const rows = filtered.map(m => [
      formatDateFr(m.date),
      formatDateTimeFr(m.created_at),
      m.product_code || '-',
      m.product_name || '-',
      m.movement_type,
      m.quantity,
      m.previous_stock,
      m.new_stock,
      m.unit_price,
      m.reference_id,
      m.created_by,
      m.reason || '',
    ]);
    exportToCSV('journal_mouvements_stock_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Journal Général des Mouvements de Stock</h2>
          <p className="text-xs text-slate-500">
            Traçabilité intégrale de chaque sac de ciment : entrées usines, enlèvements directs, départs livraisons et ajustements d'inventaire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher produit, code, réf. BR/VNT/BL..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden w-full sm:w-auto"
          >
            <option value="ALL">Tous les types de mouvement</option>
            <option value="ENTREE_ACHAT">Entrées (Approvisionnements usines)</option>
            <option value="SORTIE_VENTE_DIRECTE">Sorties (Ventes directes emportées)</option>
            <option value="SORTIE_LIVRAISON">Sorties (Livraisons chantiers)</option>
            <option value="AJUSTEMENT_INVENTAIRE_PLUS">Ajustement inventaire (+)</option>
            <option value="AJUSTEMENT_INVENTAIRE_MOINS">Ajustement inventaire (-)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Produit</th>
                <th className="py-3 px-4">Type Opération</th>
                <th className="py-3 px-4 text-right">Variation</th>
                <th className="py-3 px-4 text-right">Stock Avant &rarr; Après</th>
                <th className="py-3 px-4 text-right">Prix Unit. (CMP)</th>
                <th className="py-3 px-4">Réf. Pièce</th>
                <th className="py-3 px-4">Opérateur & Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Aucun mouvement de stock trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map(m => {
                  const isEntry = m.movement_type.includes('ENTREE') || m.movement_type.includes('PLUS');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="block font-semibold text-slate-900">{formatDateFr(m.date)}</span>
                        <span className="text-[10px] text-slate-400">{formatDateTimeFr(m.created_at).split(' ')[1] || ''}</span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="font-bold text-slate-900 block">{m.product_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{m.product_code}</span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isEntry
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {isEntry ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {m.movement_type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-sm ${isEntry ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {isEntry ? '+' : '-'}{m.quantity} sacs
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 text-[11px]">
                        {m.previous_stock} &rarr; <span className="font-bold text-slate-900">{m.new_stock} sacs</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatFCFA(m.unit_price)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.reference_id}</td>
                      <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">
                        <span className="block font-medium text-slate-700">{m.created_by}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">{m.reason || '-'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
