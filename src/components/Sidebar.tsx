import React from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  ShoppingCart,
  Send,
  FileText,
  CreditCard,
  Wallet,
  Receipt,
  Users,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'stock_movements'
  | 'purchases'
  | 'sales'
  | 'deliveries'
  | 'quotations'
  | 'invoices'
  | 'cash'
  | 'expenses'
  | 'partners'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUserRole: UserRole;
  lowStockCount?: number;
  unpaidInvoicesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  currentUserRole,
  lowStockCount = 0,
  unpaidInvoicesCount = 0,
}) => {
  // Role-based visibility
  const canAccess = (tab: NavTab): boolean => {
    if (currentUserRole === 'admin' || currentUserRole === 'responsable') return true;
    if (currentUserRole === 'gestionnaire_stock') {
      return ['dashboard', 'products', 'stock_movements', 'purchases', 'deliveries', 'inventory', 'reports'].includes(tab);
    }
    if (currentUserRole === 'commercial') {
      return ['dashboard', 'products', 'sales', 'quotations', 'invoices', 'deliveries', 'partners'].includes(tab);
    }
    if (currentUserRole === 'caissier') {
      return ['dashboard', 'sales', 'invoices', 'cash', 'expenses', 'partners'].includes(tab);
    }
    return true;
  };

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits (Ciment)', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'stock_movements', label: 'Mouvements & Stocks', icon: Layers },
    { id: 'purchases', label: 'Approvisionnements', icon: Truck },
    { id: 'sales', label: 'Ventes & Comptoir', icon: ShoppingCart },
    { id: 'deliveries', label: 'Livraisons clients', icon: Send },
    { id: 'quotations', label: 'Devis', icon: FileText },
    { id: 'invoices', label: 'Factures', icon: CreditCard, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'cash', label: 'Recettes & Caisse', icon: Wallet },
    { id: 'expenses', label: 'Dépenses du dépôt', icon: Receipt },
    { id: 'partners', label: 'Clients & Fournisseurs', icon: Users },
    { id: 'inventory', label: 'Inventaire physique', icon: ClipboardCheck },
    { id: 'reports', label: 'Rapports & Bilan', icon: BarChart3 },
    { id: 'users', label: 'Utilisateurs & Droits', icon: ShieldCheck },
    { id: 'settings', label: 'Paramètres du Dépôt', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              C
            </div>
            <div>
              <h1 className="font-bold text-white text-sm tracking-tight leading-tight">DÉPÔT CIMENT</h1>
              <p className="text-[11px] text-slate-400 font-medium">Brazzaville · Congo</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems
            .filter(item => canAccess(item.id))
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                        item.badgeColor || 'bg-orange-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Low stock quick notice if any */}
        {lowStockCount > 0 && (
          <div className="mx-3 mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] leading-tight">
              {lowStockCount} référence(s) sous le seuil minimum !
            </span>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="truncate">
            <span className="block text-slate-200 font-semibold truncate">FCFA (XAF)</span>
            <span className="text-[10px] text-slate-500">Heure de Brazzaville</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">v1.0</span>
        </div>
      </aside>
    </>
  );
};
