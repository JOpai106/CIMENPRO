import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  X,
  Trash2,
  Printer,
  CreditCard,
  Send,
  CheckCircle,
} from 'lucide-react';
import { Sale, Product, Customer, CompanySettings, Invoice } from '../types';
import { formatFCFA, formatBags, formatDateFr, getPaymentStatusLabel, getDeliveryStatusLabel } from '../utils/formatters';
import { generateInvoicePDF, generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  settings: CompanySettings;
  invoices: Invoice[];
  onRefresh: () => void;
  canEdit: boolean;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  products,
  customers,
  settings,
  invoices,
  onRefresh,
  canEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [deliveryType, setDeliveryType] = useState<'emporte_immediat' | 'a_livrer'>('emporte_immediat');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'mobile_money' | 'virement' | 'autre'>('especes');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('Clarisse Moukala (Commerciale)');

  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number; discount: number }[]>([
    { product_id: products[0]?.id || '', quantity: 50, unit_price: products[0]?.selling_price || 5200, discount: 0 },
  ]);

  const filtered = sales.filter(s => {
    const matchesSearch =
      s.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === 'ALL' || s.payment_status === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const openNewSale = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCustomerId(customers[0]?.id || '');
    setDeliveryType('emporte_immediat');
    setDeliveryAddress('');
    setDriverName('');
    setVehicleInfo('');
    setDiscount(0);
    const initialProd = products[0];
    const initialItems = [
      { product_id: initialProd?.id || '', quantity: 50, unit_price: initialProd?.selling_price || 5200, discount: 0 },
    ];
    setItems(initialItems);
    const initialSubtotal = initialItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
    setPaidAmount(initialSubtotal);
    setPaymentMethod('especes');
    setNotes('');
    setCreatedBy('Clarisse Moukala (Commerciale)');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    const p = products[0];
    if (p) {
      setItems([...items, { product_id: p.id, quantity: 20, unit_price: p.selling_price, discount: 0 }]);
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

    // Auto-update default paid amount to total if previously matched
    const currentSubtotal = updated.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) - (Number(it.discount) || 0),
      0
    );
    const currentTotal = Math.max(0, currentSubtotal - Number(discount));
    setPaidAmount(currentTotal);
  };

  const subtotalCalculated = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) - (Number(it.discount) || 0),
    0
  );
  const totalCalculated = Math.max(0, subtotalCalculated - Number(discount));
  const remainingCalculated = Math.max(0, totalCalculated - Number(paidAmount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }

    // Check stock availability
    for (const it of items) {
      const prod = products.find(p => p.id === it.product_id);
      if (!prod) continue;
      const available = prod.current_stock - prod.reserved_stock;
      if (it.quantity > available) {
        setErrorMsg(
          `Stock insuffisant pour ${prod.name} (Disponible: ${available} sacs, demandé: ${it.quantity} sacs).`
        );
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.createSale({
        date,
        customer_id: customerId,
        delivery_type: deliveryType,
        items,
        discount: Number(discount),
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        notes,
        created_by: createdBy,
        delivery_address: deliveryAddress,
        driver_name: driverName,
        vehicle_info: vehicleInfo,
      });

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la validation de la vente.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'N° Vente',
      'Date',
      'Client',
      'Type Enlèvement',
      'Total Net (FCFA)',
      'Payé (FCFA)',
      'Reste Dû (FCFA)',
      'Statut Paiement',
      'Statut Livraison',
      'Commercial',
    ];
    const rows = filtered.map(s => [
      s.sale_number,
      formatDateFr(s.date),
      s.customer_name || '-',
      s.delivery_type === 'emporte_immediat' ? 'Emporté immédiat' : 'À livrer chantier',
      s.total_amount,
      s.paid_amount,
      s.remaining_amount,
      s.payment_status,
      s.delivery_status,
      s.created_by,
    ]);
    exportToCSV('ventes_depot_ciment', headers, rows);
  };

  const handlePrintInvoice = (sale: Sale) => {
    const inv = invoices.find(i => i.sale_id === sale.id);
    if (inv) {
      generateInvoicePDF(inv, settings);
    } else {
      // Create ad-hoc invoice for preview
      const adhocInv: Invoice = {
        id: 'fac-' + sale.id,
        invoice_number: `FAC-${sale.sale_number.replace('VNT-', '')}`,
        date: sale.date,
        due_date: sale.date,
        sale_id: sale.id,
        sale_number: sale.sale_number,
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total_amount: sale.total_amount,
        paid_amount: sale.paid_amount,
        remaining_amount: sale.remaining_amount,
        payment_status: sale.payment_status,
        status: 'validee',
        created_by: sale.created_by,
        notes: sale.notes,
        items: sale.items.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_code: it.product_code,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          total_price: it.total_price,
        })),
        created_at: sale.created_at,
      };
      generateInvoicePDF(adhocInv, settings);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Ventes & Comptoir Ciment</h2>
          <p className="text-xs text-slate-500">
            Enregistrement des ventes au comptoir ou sur chantiers, gestion des acomptes et sorties de stock automatiques.
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
              onClick={openNewSale}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Vente
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher N° vente, client..."
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
            Toutes ({sales.length})
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

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Vente</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mode Enlèvement</th>
                <th className="py-3 px-4 text-center">Quantité</th>
                <th className="py-3 px-4 text-right">Total Net</th>
                <th className="py-3 px-4 text-right">Payé</th>
                <th className="py-3 px-4 text-right">Reste Dû</th>
                <th className="py-3 px-4 text-center">Paiement</th>
                <th className="py-3 px-4 text-center">Livraison</th>
                <th className="py-3 px-4 text-right">Facture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Aucune vente trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map(s => {
                  const payBadge = getPaymentStatusLabel(s.payment_status);
                  const delBadge = getDeliveryStatusLabel(s.delivery_status);
                  const totalBags = (s.items || []).reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.sale_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDateFr(s.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{s.customer_name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-700">
                          {s.delivery_type === 'emporte_immediat' ? 'Emporté immédiat' : 'À livrer sur chantier'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {formatBags(totalBags)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(s.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatFCFA(s.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {s.remaining_amount > 0 ? (
                          <span className="text-rose-600">{formatFCFA(s.remaining_amount)}</span>
                        ) : (
                          <span className="text-slate-400">0 FCFA</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${payBadge.bg}`}>
                          {payBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${delBadge.bg}`}>
                          {delBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handlePrintInvoice(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          title="Imprimer / Télécharger Facture PDF"
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

      {/* POS Modal: New Sale */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Guichet de Vente & Enlèvement Ciment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client Destinataire *</label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type d'Enlèvement *</label>
                  <select
                    value={deliveryType}
                    onChange={e => setDeliveryType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="emporte_immediat">Emporté Immédiat (Sortie Stock Immédiate)</option>
                    <option value="a_livrer">À Livrer Ultérieurement (Réservation sacs)</option>
                  </select>
                </div>
              </div>

              {/* Delivery fields if à livrer */}
              {deliveryType === 'a_livrer' && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Adresse de livraison (Chantier)</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder="Ex: Chantier Mpila, Rue 12"
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chauffeur Transporteur</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                      placeholder="Ex: Rodrigue Matondo"
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Véhicule / Plaque</label>
                    <input
                      type="text"
                      value={vehicleInfo}
                      onChange={e => setVehicleInfo(e.target.value)}
                      placeholder="Ex: Camion Mercedes 15T"
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              )}

              {/* Product Lines */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Lignes des Sacs de Ciment
                  </h4>
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
                  {items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.product_id);
                    const available = prod ? prod.current_stock - prod.reserved_stock : 0;
                    const lineTotal =
                      (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) - (Number(it.discount) || 0);

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
                                {p.name} · {p.brand} (Dispo: {p.current_stock - p.reserved_stock} sacs)
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            Stock dispo dépôt : {available} sacs
                          </span>
                        </div>

                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Quantité (Sacs)
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

                        <div className="w-full sm:w-32">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Prix Unit. (FCFA)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={it.unit_price}
                            onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-right"
                          />
                        </div>

                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                            Remise ligne
                          </label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0 FCFA"
                            value={it.discount}
                            onChange={e => handleItemChange(idx, 'discount', Number(e.target.value))}
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

              {/* Financial Calculation & Payment Terms */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Remise Globale (FCFA)</label>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={e => {
                        const d = Number(e.target.value);
                        setDiscount(d);
                        setPaidAmount(Math.max(0, subtotalCalculated - d));
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mode de Paiement *</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="especes">Espèces (Guichet Caisse)</option>
                      <option value="mobile_money">Mobile Money (MTN MoMo / Airtel)</option>
                      <option value="virement">Virement Bancaire (BGFI, LCB, etc.)</option>
                      <option value="autre">Chèque / Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Montant Payé Ce Jour (FCFA) *</label>
                    <input
                      type="number"
                      min={0}
                      max={totalCalculated}
                      value={paidAmount}
                      onChange={e => setPaidAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 text-right"
                    />
                  </div>
                </div>

                {/* Summary numbers */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Net à Payer</span>
                    <span className="block font-mono font-bold text-slate-900 text-sm">
                      {formatFCFA(totalCalculated)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Montant Réglé</span>
                    <span className="block font-mono font-bold text-emerald-600 text-sm">
                      {formatFCFA(paidAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Reste Dû (Créance)</span>
                    <span className={`block font-mono font-bold text-sm ${remainingCalculated > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatFCFA(remainingCalculated)}
                    </span>
                  </div>
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
                  {saving ? 'Validation Vente & Sortie Stock...' : 'Valider la Vente & Facturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
