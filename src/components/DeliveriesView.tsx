import React, { useState } from 'react';
import { Send, Search, Filter, Download, Truck, Printer, CheckCircle, Clock, AlertTriangle, X, Trash2 } from 'lucide-react';
import { Delivery, CompanySettings } from '../types';
import { formatDateFr, formatBags, getDeliveryStatusLabel } from '../utils/formatters';
import { generateDeliverySlipPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DeliveriesViewProps {
  deliveries: Delivery[];
  settings: CompanySettings;
  onRefresh: () => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  deliveries,
  settings,
  onRefresh,
  canEdit,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDelivery = async () => {
    if (!deliveryToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteDelivery(deliveryToDelete.id);
      setDeliveryToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de la livraison');
    } finally {
      setIsDeleting(false);
    }
  };

  // Execution modal
  const [executingDelivery, setExecutingDelivery] = useState<Delivery | null>(null);
  const [driverName, setDriverName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [execNotes, setExecNotes] = useState('');
  const [itemsToDeliver, setItemsToDeliver] = useState<{ product_id: string; product_name: string; quantity_to_deliver: number; remaining: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = deliveries.filter(d => {
    const matchesSearch =
      d.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.delivery_address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openExecuteModal = (del: Delivery) => {
    setExecutingDelivery(del);
    setDriverName(del.driver_name || 'Rodrigue Matondo');
    setVehicleInfo(del.vehicle_info || 'Camion Mercedes 15T');
    setExecNotes(del.notes || '');
    setItemsToDeliver(
      del.items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name || 'Ciment',
        quantity_to_deliver: it.quantity_remaining > 0 ? it.quantity_remaining : 0,
        remaining: it.quantity_remaining,
      }))
    );
    setErrorMsg('');
  };

  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executingDelivery) return;

    if (itemsToDeliver.every(it => it.quantity_to_deliver <= 0)) {
      setErrorMsg('Veuillez saisir une quantité à charger supérieure à 0.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.executeDelivery(executingDelivery.id, {
        delivery_items: itemsToDeliver,
        driver_name: driverName,
        vehicle_info: vehicleInfo,
        notes: execNotes,
      });

      setExecutingDelivery(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la validation du chargement.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° Bon Livraison', 'Date', 'N° Vente', 'Client', 'Adresse Chantier', 'Chauffeur', 'Véhicule', 'Statut'];
    const rows = filtered.map(d => [
      d.delivery_number,
      formatDateFr(d.date),
      d.sale_number || d.sale_id,
      d.customer_name || '-',
      d.delivery_address,
      d.driver_name,
      d.vehicle_info,
      d.status,
    ]);
    exportToCSV('bons_de_livraison_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Gestion des Livraisons Chantiers</h2>
          <p className="text-xs text-slate-500">
            Suivi des rotations de camions, déchargement sur chantier, régularisation des sacs réservés et bons de livraison.
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
            placeholder="Rechercher BL, client, chantier, chauffeur..."
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
            Toutes ({deliveries.length})
          </button>
          <button
            onClick={() => setStatusFilter('en_attente')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'en_attente' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En Attente
          </button>
          <button
            onClick={() => setStatusFilter('partielle')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'partielle' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partielles
          </button>
          <button
            onClick={() => setStatusFilter('livree')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'livree' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Livrées
          </button>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Bon Livraison</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client & Chantier</th>
                <th className="py-3 px-4">Transporteur & Véhicule</th>
                <th className="py-3 px-4 text-center">Progression Sacs</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucune livraison trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map(d => {
                  const badge = getDeliveryStatusLabel(d.status);
                  const totalOrdered = d.items.reduce((acc, it) => acc + it.quantity_ordered, 0);
                  const totalDelivered = d.items.reduce((acc, it) => acc + it.quantity_delivered, 0);
                  const totalRemaining = d.items.reduce((acc, it) => acc + it.quantity_remaining, 0);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.delivery_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(d.date)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{d.customer_name}</span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                          {d.delivery_address}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{d.driver_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{d.vehicle_info}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-slate-900">
                          {totalDelivered} / {totalOrdered} sacs
                        </span>
                        {totalRemaining > 0 && (
                          <span className="block text-[10px] text-amber-600 font-mono font-medium">
                            Reste: {totalRemaining} sacs
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.status !== 'livree' && canEdit && (
                            <button
                              onClick={() => openExecuteModal(d)}
                              className="px-2.5 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-md shadow-2xs transition-colors"
                            >
                              Charger Camion
                            </button>
                          )}
                          <button
                            onClick={() => generateDeliverySlipPDF(d, settings)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            title="Imprimer Bon de Livraison"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeliveryToDelete(d)}
                              title="Supprimer ce bon de livraison (Admin)"
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

      {/* Execute Delivery Modal */}
      {executingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Départ Livraison : {executingDelivery.delivery_number}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Client : {executingDelivery.customer_name} · Chantier : {executingDelivery.delivery_address}
                </p>
              </div>
              <button
                onClick={() => setExecutingDelivery(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom du Chauffeur *</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Véhicule / Plaque Immat. *</label>
                  <input
                    type="text"
                    required
                    value={vehicleInfo}
                    onChange={e => setVehicleInfo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Items load entry */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quantités Chargées dans ce Camion
                </h4>

                <div className="space-y-2">
                  {itemsToDeliver.map((it, idx) => (
                    <div
                      key={it.product_id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{it.product_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Restant à livrer : {it.remaining} sacs
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-600 font-semibold">Charger :</label>
                        <input
                          type="number"
                          min={0}
                          max={it.remaining}
                          value={it.quantity_to_deliver}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const updated = [...itemsToDeliver];
                            updated[idx].quantity_to_deliver = val;
                            setItemsToDeliver(updated);
                          }}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-md font-mono font-bold text-right text-xs"
                        />
                        <span className="text-slate-500 font-mono text-[11px]">sacs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Observations / État de la route</label>
                <input
                  type="text"
                  value={execNotes}
                  onChange={e => setExecNotes(e.target.value)}
                  placeholder="Rotation matin, sacs sanglés et bâchés..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExecutingDelivery(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Déstockage en cours...' : 'Valider le Départ & Déstocker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      <ConfirmDeleteModal
        isOpen={!!deliveryToDelete}
        onClose={() => setDeliveryToDelete(null)}
        onConfirm={handleDeleteDelivery}
        title="Supprimer le bon de livraison"
        itemDescription={deliveryToDelete ? `${deliveryToDelete.delivery_number} - ${deliveryToDelete.customer_name} (${deliveryToDelete.delivery_address})` : ''}
        warningNote="La suppression de ce bon de livraison réintégrera les sacs livrés dans le stock physique et rétablira le solde à livrer. Réservé à l'administrateur."
        isDeleting={isDeleting}
      />
    </div>
  );
};
