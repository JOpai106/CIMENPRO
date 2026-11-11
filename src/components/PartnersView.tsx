import React, { useState } from 'react';
import { Users, Truck, Plus, Search, Filter, Download, AlertTriangle, X, Phone, MapPin, Building } from 'lucide-react';
import { Customer, Supplier, CustomerType } from '../types';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface PartnersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  onRefresh: () => void;
  canEdit: boolean;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  customers,
  suppliers,
  onRefresh,
  canEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('ALL');

  // Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cType, setCType] = useState<CustomerType>('entrepreneur_btp');
  const [cCreditLimit, setCCreditLimit] = useState<number>(5000000);

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sContact, setSContact] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sNotes, setSNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const customerTypeLabels: Record<CustomerType, string> = {
    grossiste: 'Grossiste',
    demi_grossiste: 'Demi-Grossiste',
    détaillant: 'Détaillant',
    entrepreneur_btp: 'Entrepreneur BTP',
    particulier: 'Particulier',
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = customerTypeFilter === 'ALL' || c.customer_type === customerTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredSuppliers = suppliers.filter(s => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cPhone.trim()) {
      setErrorMsg('Veuillez renseigner le nom et le numéro de téléphone.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await api.createCustomer({
        name: cName,
        phone: cPhone,
        address: cAddress || 'Brazzaville',
        customer_type: cType,
        credit_limit: Number(cCreditLimit),
      });
      setIsCustomerModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur enregistrement client.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim() || !sPhone.trim()) {
      setErrorMsg('Veuillez renseigner la raison sociale et le téléphone.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await api.createSupplier({
        name: sName,
        phone: sPhone,
        address: sAddress || 'Zone Industrielle',
        contact_person: sContact,
        email: sEmail,
        notes: sNotes,
      });
      setIsSupplierModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur enregistrement fournisseur.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'customers') {
      const headers = ['Nom Client', 'Téléphone', 'Adresse', 'Type Client', 'Plafond Crédit', 'Total Facturé', 'Total Payé', 'Solde Dû'];
      const rows = filteredCustomers.map(c => [
        c.name,
        c.phone,
        c.address,
        customerTypeLabels[c.customer_type] || c.customer_type,
        c.credit_limit,
        c.total_invoiced || 0,
        c.total_paid || 0,
        c.balance_due || 0,
      ]);
      exportToCSV('clients_depot_ciment', headers, rows);
    } else {
      const headers = ['Nom Fournisseur Usine', 'Téléphone', 'Adresse', 'Contact Principal', 'Email', 'Total Approvisionnements'];
      const rows = filteredSuppliers.map(s => [
        s.name,
        s.phone,
        s.address,
        s.contact_person || '-',
        s.email || '-',
        s.total_purchases || 0,
      ]);
      exportToCSV('fournisseurs_usines_ciment', headers, rows);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Répertoire Clients & Fournisseurs</h2>
          <p className="text-xs text-slate-500">
            Fiches partenaires, historique des commandes de ciment, plafonds d'encours et créances dues.
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
              onClick={() => {
                if (activeTab === 'customers') {
                  setCName('');
                  setCPhone('+242 06 ');
                  setCAddress('Brazzaville');
                  setCType('entrepreneur_btp');
                  setCCreditLimit(5000000);
                  setIsCustomerModalOpen(true);
                } else {
                  setSName('');
                  setSPhone('+242 06 ');
                  setSAddress('Zone Industrielle');
                  setSContact('');
                  setSEmail('');
                  setSNotes('');
                  setIsSupplierModalOpen(true);
                }
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'customers' ? 'Nouveau Client' : 'Nouveau Fournisseur'}
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tab Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'customers'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clients BTP & Revendeurs ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Fournisseurs Usines ({suppliers.length})</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'customers' ? 'Rechercher client, téléphone...' : 'Rechercher usine, contact...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {activeTab === 'customers' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={customerTypeFilter}
              onChange={e => setCustomerTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="ALL">Tous les types de clients</option>
              {Object.entries(customerTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Customers Table */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Raison Sociale / Nom</th>
                  <th className="py-3 px-4">Type Client</th>
                  <th className="py-3 px-4">Téléphone & Adresse</th>
                  <th className="py-3 px-4 text-right">Plafond Crédit</th>
                  <th className="py-3 px-4 text-right">Total Facturé</th>
                  <th className="py-3 px-4 text-right">Total Réglé</th>
                  <th className="py-3 px-4 text-right">Solde Dû (Créance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aucun client trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {customerTypeLabels[c.customer_type] || c.customer_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="block font-mono text-slate-800">{c.phone}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block">{c.address}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatFCFA(c.credit_limit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatFCFA(c.total_invoiced || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {formatFCFA(c.total_paid || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        {(c.balance_due || 0) > 0 ? (
                          <span className="text-rose-600">{formatFCFA(c.balance_due)}</span>
                        ) : (
                          <span className="text-slate-400">0 FCFA</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers Table */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Usine / Fournisseur</th>
                  <th className="py-3 px-4">Coordonnées</th>
                  <th className="py-3 px-4">Contact Référent</th>
                  <th className="py-3 px-4 text-right">Volume Achat Cumulé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Aucun fournisseur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        <span className="text-[11px] text-slate-500">{s.address}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="block font-mono">{s.phone}</span>
                        <span className="text-[11px] text-slate-400">{s.email || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{s.contact_person || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatFCFA(s.total_purchases || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Ajouter un Nouveau Client</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  placeholder="Ex: Entreprise Nouvelle Construction"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={cPhone}
                    onChange={e => setCPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie Client *</label>
                  <select
                    value={cType}
                    onChange={e => setCType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {Object.entries(customerTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse / Chantier Principal</label>
                <input
                  type="text"
                  value={cAddress}
                  onChange={e => setCAddress(e.target.value)}
                  placeholder="Ex: Mpila, Brazzaville"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plafond Crédit Autorisé (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={cCreditLimit}
                  onChange={e => setCCreditLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Créer Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Ajouter un Fournisseur Usine</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Raison Sociale Usine / Cimenterie *</label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  placeholder="Ex: Cimenterie Nationale"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={sPhone}
                    onChange={e => setSPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Référent</label>
                  <input
                    type="text"
                    value={sContact}
                    onChange={e => setSContact(e.target.value)}
                    placeholder="Nom responsable"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse Usine / Dépôt Central</label>
                <input
                  type="text"
                  value={sAddress}
                  onChange={e => setSAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Créer Fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
