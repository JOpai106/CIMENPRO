import React, { useState } from 'react';
import { ShieldCheck, Plus, User, AlertTriangle, X, Check, Shield } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { formatDateFr } from '../utils/formatters';
import { api } from '../services/api';

interface UsersViewProps {
  users: UserType[];
  onRefresh: () => void;
  canEdit: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onRefresh,
  canEdit,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('commercial');
  const [phone, setPhone] = useState('+242 06 ');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roleTitles: Record<UserRole, string> = {
    admin: 'Administrateur',
    gestionnaire_stock: 'Gestionnaire de Stock',
    commercial: 'Commercial',
    caissier: 'Caissier(ère)',
    responsable: 'Responsable Dépôt',
  };

  const rolePermissions: { module: string; admin: boolean; stock: boolean; com: boolean; caisse: boolean; resp: boolean }[] = [
    { module: 'Tableau de bord & KPIs', admin: true, stock: true, com: true, caisse: true, resp: true },
    { module: 'Gestion des Produits & Prix', admin: true, stock: true, com: false, caisse: false, resp: true },
    { module: 'Réceptions Approvisionnements', admin: true, stock: true, com: false, caisse: false, resp: true },
    { module: 'Livraisons Chantiers (Chargement)', admin: true, stock: true, com: true, caisse: false, resp: true },
    { module: 'Ventes Comptoir & Devis', admin: true, stock: false, com: true, caisse: true, resp: true },
    { module: 'Édition & Annulation Factures', admin: true, stock: false, com: true, caisse: true, resp: true },
    { module: 'Encaissements Caisse & Reçus', admin: true, stock: false, com: false, caisse: true, resp: true },
    { module: 'Dépenses Exploitation', admin: true, stock: false, com: false, caisse: true, resp: true },
    { module: 'Inventaire Physique & Régularisation', admin: true, stock: true, com: false, caisse: false, resp: true },
    { module: 'Rapports Financiers & Bilans', admin: true, stock: false, com: false, caisse: false, resp: true },
    { module: 'Paramétrage Entreprise & Utilisateurs', admin: true, stock: false, com: false, caisse: false, resp: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg("Veuillez renseigner le nom et l'email.");
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await api.createUser({
        name,
        email,
        role,
        phone,
      });

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la création de l'utilisateur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Utilisateurs & Contrôle d'Accès (RBAC)</h2>
          <p className="text-xs text-slate-500">
            Gestion des profils opérateurs et cloisonnement strict des permissions côté serveur et interface.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setName('');
              setEmail('');
              setRole('commercial');
              setPhone('+242 06 ');
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nouvel Utilisateur
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Équipe & Collaborateurs du Dépôt
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Collaborateur</th>
                <th className="py-3 px-4">Rôle & Droits</th>
                <th className="py-3 px-4">Email de Connexion</th>
                <th className="py-3 px-4">Téléphone</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                      <Shield className="w-3 h-3 text-orange-400" />
                      {roleTitles[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{u.phone || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Actif
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{formatDateFr(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Matrice des Droits par Profil
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Fonctionnalité / Module</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-center">Gestionnaire Stock</th>
                <th className="py-2.5 px-3 text-center">Commercial</th>
                <th className="py-2.5 px-3 text-center">Caissier(ère)</th>
                <th className="py-2.5 px-3 text-center">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rolePermissions.map((rp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{rp.module}</td>
                  <td className="py-2.5 px-3 text-center">
                    {rp.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rp.stock ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rp.com ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rp.caisse ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rp.resp ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Ajouter un Collaborateur</h3>
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
                <label className="block font-semibold text-slate-700 mb-1">Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Michel Ntsika"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="m.ntsika@depotciment.cg"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rôle et Permissions *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {Object.entries(roleTitles).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
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
                  {saving ? 'Création...' : "Créer l'Utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
