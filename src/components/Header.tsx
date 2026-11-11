import React from 'react';
import { Menu, Plus, UserCheck, Shield } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  currentTitle: string;
  onQuickNewSale: () => void;
  currentUserRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  currentTitle,
  onQuickNewSale,
  currentUserRole,
  onRoleChange,
}) => {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrateur (Complet)',
    gestionnaire_stock: 'Gestionnaire Stock',
    commercial: 'Commercial',
    caissier: 'Caissier(ère)',
    responsable: 'Responsable Dépôt',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight">{currentTitle}</h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">Dépôt Central · Gestion commerciale et des stocks</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Sale Action */}
        <button
          onClick={onQuickNewSale}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle Vente</span>
          <span className="sm:hidden">Vente</span>
        </button>

        {/* User Role Switcher for Testing & Production Permissions */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800">Profil Actif</span>
            <span className="text-[10px] text-slate-500 font-mono">Brazzaville</span>
          </div>

          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs transition-colors">
              <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <select
                value={currentUserRole}
                onChange={e => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-hidden cursor-pointer"
                title="Changer de rôle pour tester les droits"
              >
                <option value="admin">Admin ({roleNames.admin})</option>
                <option value="gestionnaire_stock">{roleNames.gestionnaire_stock}</option>
                <option value="commercial">{roleNames.commercial}</option>
                <option value="caissier">{roleNames.caissier}</option>
                <option value="responsable">{roleNames.responsable}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
