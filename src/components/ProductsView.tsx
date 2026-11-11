import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  History,
  Edit2,
  X,
  Layers,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { Product, Supplier, StockMovement } from '../types';
import { formatFCFA, formatBags, formatDateFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ProductsViewProps {
  products: Product[];
  suppliers: Supplier[];
  onRefresh: () => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  suppliers,
  onRefresh,
  canEdit,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('CIMAF');
  const [typeRef, setTypeRef] = useState('CPJ 35');
  const [packaging, setPackaging] = useState('50kg');
  const [unit, setUnit] = useState('sac');
  const [purchasePrice, setPurchasePrice] = useState<number>(4600);
  const [sellingPrice, setSellingPrice] = useState<number>(5200);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(100);
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');

  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type_ref.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.current_stock <= p.min_stock;
    if (stockFilter === 'out') matchesStock = p.current_stock <= 0;
    return matchesSearch && matchesBrand && matchesStock;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setCode(`CIM-${Date.now().toString().slice(-4)}`);
    setName('');
    setBrand('CIMAF');
    setTypeRef('CPJ 35');
    setPackaging('50kg');
    setUnit('sac');
    setPurchasePrice(4600);
    setSellingPrice(5200);
    setInitialStock(100);
    setMinStock(100);
    setSupplierId(suppliers[0]?.id || '');
    setDescription('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setBrand(p.brand);
    setTypeRef(p.type_ref);
    setPackaging(p.packaging);
    setUnit(p.unit);
    setPurchasePrice(p.purchase_price);
    setSellingPrice(p.selling_price);
    setInitialStock(p.initial_stock);
    setMinStock(p.min_stock);
    setSupplierId(p.supplier_id || '');
    setDescription(p.description || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setErrorMsg('Veuillez renseigner le code et le nom du produit.');
      return;
    }
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          code,
          name,
          brand,
          type_ref: typeRef,
          packaging,
          unit,
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice),
          min_stock: Number(minStock),
          supplier_id: supplierId || undefined,
          description,
        });
      } else {
        await api.createProduct({
          code,
          name,
          brand,
          type_ref: typeRef,
          packaging,
          unit,
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice),
          initial_stock: Number(initialStock),
          min_stock: Number(minStock),
          supplier_id: supplierId || undefined,
          description,
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement du produit.");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (p: Product) => {
    setHistoryProduct(p);
    setLoadingMovements(true);
    try {
      const data = await api.getProductMovements(p.id);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Code',
      'Nom Produit',
      'Marque',
      'Type/Référence',
      'Conditionnement',
      'Unité',
      'Prix Achat (FCFA)',
      'Prix Vente (FCFA)',
      'Stock Actuel (sacs)',
      'Stock Réservé (sacs)',
      'Stock Disponible (sacs)',
      'Stock Minimum (sacs)',
      'Fournisseur Principal',
    ];
    const rows = filteredProducts.map(p => [
      p.code,
      p.name,
      p.brand,
      p.type_ref,
      p.packaging,
      p.unit,
      p.purchase_price,
      p.selling_price,
      p.current_stock,
      p.reserved_stock,
      p.current_stock - p.reserved_stock,
      p.min_stock,
      p.supplier_name || '-',
    ]);
    exportToCSV('catalogue_produits_ciment', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Catalogue des Produits (Ciment)</h2>
          <p className="text-xs text-slate-500">
            Gestion des références, conditionnements 50kg, prix unitaires et contrôle strict des seuils d'alerte.
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
              onClick={openAddModal}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouveau Produit
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher code, nom, référence..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Brand & Stock Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Brand select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">Toutes les marques</option>
              {brands.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Stock state segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                stockFilter === 'low' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock Faible
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                stockFilter === 'out' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rupture
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Désignation Produit</th>
                <th className="py-3 px-4">Marque</th>
                <th className="py-3 px-4 text-right">Prix Achat</th>
                <th className="py-3 px-4 text-right">Prix Vente</th>
                <th className="py-3 px-4 text-right">Stock Réel</th>
                <th className="py-3 px-4 text-right">Réservé</th>
                <th className="py-3 px-4 text-right font-bold text-slate-800">Disponible</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Aucun produit ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const available = p.current_stock - p.reserved_stock;
                  const isLow = p.current_stock <= p.min_stock;
                  const isOut = p.current_stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{p.code}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {p.type_ref} · {p.packaging}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{p.brand}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatFCFA(p.purchase_price)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">{formatFCFA(p.selling_price)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{p.current_stock} sacs</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {p.reserved_stock > 0 ? (
                          <span className="text-amber-600 font-semibold">{p.reserved_stock} sacs</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        {available} sacs
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Rupture
                          </span>
                        ) : isLow ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Faible ({p.current_stock} &le; {p.min_stock})
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistory(p)}
                            title="Historique des mouvements"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(p)}
                              title="Modifier la fiche produit"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              title="Supprimer ce produit (Admin)"
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Modifier la Fiche Produit' : 'Ajouter une Nouvelle Référence de Ciment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code Produit *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marque du Ciment *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="Ex: CIMAF, DANGOTE, CBC"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Nom Complet du Produit *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Ciment Gris CIMAF CPJ 35"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type / Référence</label>
                  <input
                    type="text"
                    value={typeRef}
                    onChange={e => setTypeRef(e.target.value)}
                    placeholder="CPJ 35 / 42.5"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conditionnement</label>
                  <input
                    type="text"
                    value={packaging}
                    onChange={e => setPackaging(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix d'Achat Unitaire (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix de Vente Unitaire (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {!editingProduct && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stock Initial (Sacs) *</label>
                    <input
                      type="number"
                      min={0}
                      value={initialStock}
                      onChange={e => setInitialStock(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Seuil Alerte Stock Min (Sacs) *</label>
                  <input
                    type="number"
                    min={1}
                    value={minStock}
                    onChange={e => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Fournisseur Principal</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Description & Spécifications</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Usage recommandé (béton armé, dallage, crépis...)"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
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
                  {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Stock Movements History Drawer */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Journal de Stock : {historyProduct.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Code: {historyProduct.code} · Stock physique actuel: {historyProduct.current_stock} sacs
                </p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loadingMovements ? (
                <div className="py-8 text-center text-slate-400 text-xs">Chargement des mouvements...</div>
              ) : movements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">Aucun mouvement enregistré pour ce produit.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Qté</th>
                      <th className="py-2 px-3 text-right">Avant &rarr; Après</th>
                      <th className="py-2 px-3">Réf / Pièce</th>
                      <th className="py-2 px-3">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {movements.map(m => {
                      const isEntry = m.movement_type.includes('ENTREE') || m.movement_type.includes('PLUS');
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-slate-600">{formatDateFr(m.date)}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isEntry ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                              }`}
                            >
                              {m.movement_type}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${isEntry ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {isEntry ? '+' : '-'}{m.quantity}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                            {m.previous_stock} &rarr; {m.new_stock}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{m.reference_id}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] font-sans">{m.created_by}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      <ConfirmDeleteModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Supprimer la référence de ciment"
        itemDescription={productToDelete ? `${productToDelete.code} - ${productToDelete.name} (${productToDelete.current_stock} sacs en stock)` : ''}
        warningNote="La suppression de ce produit supprimera la référence du catalogue et ses écritures de stock. Cette action est irréversible et réservée à l'administrateur."
        isDeleting={isDeleting}
      />
    </div>
  );
};
