import React from 'react';
import {
  Package,
  Layers,
  TrendingUp,
  CreditCard,
  Wallet,
  Receipt,
  Users,
  AlertTriangle,
  FileText,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { formatFCFA, formatBags, formatDateFr } from '../utils/formatters';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigateTab: (tab: string) => void;
  onQuickNewSale: () => void;
  onQuickNewPurchase: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigateTab,
  onQuickNewSale,
  onQuickNewPurchase,
}) => {
  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Banner */}
      <div className="bg-slate-900 rounded-xl p-5 sm:p-6 text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Aperçu Opérationnel</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">Dépôt Central de Ciment</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Gestion en temps réel des stocks de sacs de ciment, encaissements comptant/Mobile Money, livraisons sur chantiers et créances clients.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onQuickNewPurchase}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            Réception Stock
          </button>
          <button
            onClick={onQuickNewSale}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            Nouvelle Vente
          </button>
        </div>
      </div>

      {/* Row 1: Primary Stock & Commercial Indicators */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stocks Physiques & Valorisation</h3>
          <span className="text-xs text-slate-400 font-mono">Unité: Sac 50kg</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Stock Total Disponible</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {formatBags(stats.total_stock_bags)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{stats.product_count} références actives</span>
              <span className="text-emerald-600 font-medium font-mono">Physique dépôt</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Valeur Financière (CMP)</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {formatFCFA(stats.stock_financial_value)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Coût moyen pondéré d'achat
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Sacs Reçus (Appro.)</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {formatBags(stats.total_received_bags)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Entrées usines validées
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Sacs Livrés aux Clients</span>
              <ArrowUpRight className="w-4 h-4 text-orange-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {formatBags(stats.total_delivered_bags)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Vendus: {stats.total_sold_bags} sacs</span>
              <span className="text-slate-400">Sorties effectives</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Financial Results & Cash Flow Indicators */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires & Trésorerie</h3>
          <span className="text-xs text-slate-400 font-mono">Devise: FCFA</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CA Jour / Semaine / Mois */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Chiffre d'Affaires (CA)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
              {formatFCFA(stats.ca_month)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Aujourd'hui:</span>
                <span className="font-semibold text-slate-700 font-mono">{formatFCFA(stats.ca_today)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cette semaine:</span>
                <span className="font-semibold text-slate-700 font-mono">{formatFCFA(stats.ca_week)}</span>
              </div>
            </div>
          </div>

          {/* Recettes Réellement Encaissées */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Recettes Encaissées</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-600 font-mono">
              {formatFCFA(stats.collected_receipts)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Total payé en espèces, MoMo, virement
            </div>
          </div>

          {/* Créances Clients */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Créances Clients (Dettes)</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-rose-600 font-mono">
              {formatFCFA(stats.customer_debts)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Factures impayées & soldes dus
            </div>
          </div>

          {/* Bénéfice Brut Estimé & Caisse */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Bénéfice Brut Estimé</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
              {formatFCFA(stats.estimated_gross_profit)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dépenses: {formatFCFA(stats.total_expenses)}</span>
              <span className="text-emerald-700 font-semibold font-mono">Caisse: {formatFCFA(stats.cash_balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Visual Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Brand breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Répartition par Marque</h4>
            <span className="text-[11px] text-slate-400">Total ventes</span>
          </div>

          <div className="space-y-3">
            {stats.charts.sales_by_brand.map((item, idx) => {
              const maxBags = Math.max(...stats.charts.sales_by_brand.map(b => b.bags), 1);
              const pct = Math.round((item.bags / maxBags) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.brand}</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {formatBags(item.bags)} · {formatFCFA(item.amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-orange-500' : idx === 1 ? 'bg-blue-600' : idx === 2 ? 'bg-emerald-600' : 'bg-slate-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock levels by product */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Niveaux de Stock Actuels</h4>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              Voir tous les produits →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.charts.stock_by_product.map((p, idx) => {
              const isLow = p.stock <= p.min_stock;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    isLow ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Min: {p.min_stock} sacs</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold font-mono text-sm block ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                      {p.stock} sacs
                    </span>
                    {isLow && (
                      <span className="text-[10px] font-semibold text-amber-600 uppercase">Alerte stock</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Critical Alerts & Action Queues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unpaid Invoices Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Factures Impayées Récentes</h4>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium"
            >
              Consulter tout
            </button>
          </div>

          {stats.alerts.unpaid_invoices.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucune facture en souffrance.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.alerts.unpaid_invoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 font-mono">{inv.invoice_number}</span>
                    <span className="text-slate-500 block">{inv.customer_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600 font-mono block">
                      Reste: {formatFCFA(inv.remaining_amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Échéance: {formatDateFr(inv.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Quotations Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Devis en Attente de Validation</h4>
            </div>
            <button
              onClick={() => onNavigateTab('quotations')}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium"
            >
              Consulter tout
            </button>
          </div>

          {stats.alerts.pending_quotes.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Aucun devis en attente.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.alerts.pending_quotes.map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 font-mono">{q.quote_number}</span>
                    <span className="text-slate-500 block">{q.customer_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 font-mono block">
                      {formatFCFA(q.total_amount)}
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium uppercase">{q.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
