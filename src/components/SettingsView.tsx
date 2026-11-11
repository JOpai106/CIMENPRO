import React, { useState } from 'react';
import { Settings, Save, RotateCcw, Trash2, Database, Shield, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { CompanySettings } from '../types';
import { api } from '../services/api';

interface SettingsViewProps {
  settings: CompanySettings;
  onRefresh: () => void;
  canEdit: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onRefresh,
  canEdit,
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Demo data state
  const [resettingDemo, setResettingDemo] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.updateSettings(formData);
      setSuccessMsg("Paramètres de l'entreprise enregistrés avec succès.");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Voulez-vous réinitialiser les données avec le jeu de démonstration complet ?')) {
      return;
    }
    setResettingDemo(true);
    try {
      await api.resetDemoData();
      alert('Données de démonstration rechargées avec succès.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setResettingDemo(false);
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      await api.purgeData();
      setConfirmPurge(false);
      alert('Toutes les données opérationnelles ont été purgées.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la purge.');
    } finally {
      setPurging(false);
    }
  };

  const sqlMigrationSchema = `-- Schéma PostgreSQL / Supabase pour Gestion Dépôt Ciment
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  nif TEXT,
  currency TEXT DEFAULT 'FCFA',
  prefix_quote TEXT DEFAULT 'DEV-',
  prefix_invoice TEXT DEFAULT 'FAC-',
  prefix_receipt TEXT DEFAULT 'REC-',
  prefix_delivery TEXT DEFAULT 'BL-',
  prefix_purchase TEXT DEFAULT 'BR-',
  low_stock_threshold INTEGER DEFAULT 100,
  timezone TEXT DEFAULT 'Africa/Brazzaville'
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  type_ref TEXT NOT NULL,
  packaging TEXT DEFAULT '50kg',
  unit TEXT DEFAULT 'sac',
  purchase_price NUMERIC(15,2) NOT NULL,
  selling_price NUMERIC(15,2) NOT NULL,
  current_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  product_id UUID REFERENCES products(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlMigrationSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Paramètres de l'Entreprise & Données</h2>
        <p className="text-xs text-slate-500">
          Configuration des coordonnées d'en-tête, devise FCFA, préfixes de pièces et maintenance des données.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identité Entreprise */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
            Identité Commerciale du Dépôt
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Raison Sociale de l'Entreprise *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={e => handleChange('company_name', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slogan / Activité</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adresse Physique *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ville *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pays *</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={e => handleChange('country', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphones Dépôt *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Commercial *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIF (Identifiant Fiscal)</label>
              <input
                type="text"
                value={formData.nif || ''}
                onChange={e => handleChange('nif', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fuseau Horaire</label>
              <input
                type="text"
                disabled
                value={formData.timezone}
                className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Préfixes & Coordonnées de Paiement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
            Documents Commerciaux & Règlements
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Préfixe Devis</label>
              <input
                type="text"
                value={formData.prefix_quote}
                onChange={e => handleChange('prefix_quote', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Préfixe Factures</label>
              <input
                type="text"
                value={formData.prefix_invoice}
                onChange={e => handleChange('prefix_invoice', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Préfixe Reçus</label>
              <input
                type="text"
                value={formData.prefix_receipt}
                onChange={e => handleChange('prefix_receipt', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Préfixe Livraisons</label>
              <input
                type="text"
                value={formData.prefix_delivery}
                onChange={e => handleChange('prefix_delivery', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coordonnées Bancaires (RIB / Compte)</label>
              <textarea
                rows={2}
                value={formData.bank_details || ''}
                onChange={e => handleChange('bank_details', e.target.value)}
                placeholder="Ex: BGFI Congo N° Compte 30004 00120..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Comptes Marchands Mobile Money</label>
              <textarea
                rows={2}
                value={formData.mobile_money_details || ''}
                onChange={e => handleChange('mobile_money_details', e.target.value)}
                placeholder="Ex: MTN MoMo Marchand: 06 654 32 10..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Mention Légale de Bas de Page PDF</label>
            <input
              type="text"
              value={formData.footer_note || ''}
              onChange={e => handleChange('footer_note', e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          {canEdit && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Demonstration Data & Production Readiness */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
          Gestion des Données de Test & Mise en Production
        </h3>

        <p className="text-xs text-slate-600">
          L'application intègre un jeu de données de test représentatif du marché congolais (marques CIMAF, DANGOTE, CBC, SOCIMAT, factures, réceptions et dettes). Vous pouvez réinitialiser les données de démo à tout moment ou les purger pour démarrer l'exploitation réelle du dépôt.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={resettingDemo}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            {resettingDemo ? 'Rechargement...' : 'Recharger Données de Démonstration'}
          </button>

          {!confirmPurge ? (
            <button
              type="button"
              onClick={() => setConfirmPurge(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Purger Toutes les Données Opérationnelles
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePurge}
                disabled={purging}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                {purging ? 'Purge en cours...' : 'Confirmer Définitivement la Purge'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Relational DB & Supabase Migration Tool */}
      <div className="bg-slate-900 rounded-xl p-5 text-white border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-orange-400">
              Architecture & Base de Données Relationnelle
            </h3>
          </div>
          <button
            onClick={copySql}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copiedSql ? 'Copié !' : 'Copier Script SQL'}
          </button>
        </div>

        <p className="text-xs text-slate-300">
          L'application utilise un moteur SQL relationnel avec transactions ACID garantissant qu'aucune opération commerciale (déstockage, double encaissement, régularisation d'inventaire) n'entraîne d'incohérence.
        </p>

        <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-400 overflow-x-auto border border-slate-800/80 max-h-48">
          {sqlMigrationSchema}
        </pre>
      </div>
    </div>
  );
};
