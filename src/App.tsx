import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { StockMovementsView } from './components/StockMovementsView';
import { PurchasesView } from './components/PurchasesView';
import { SalesView } from './components/SalesView';
import { DeliveriesView } from './components/DeliveriesView';
import { QuotationsView } from './components/QuotationsView';
import { InvoicesView } from './components/InvoicesView';
import { CashView } from './components/CashView';
import { ExpensesView } from './components/ExpensesView';
import { PartnersView } from './components/PartnersView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { UserGuideView } from './components/UserGuideView';

import {
  Product,
  Supplier,
  Customer,
  Purchase,
  Sale,
  Delivery,
  Quotation,
  Invoice,
  Payment,
  Expense,
  InventoryAdjustment,
  StockMovement,
  User,
  UserRole,
  CompanySettings,
  DashboardStats,
} from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');

  // Application Data States
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashFlow, setCashFlow] = useState<{ total_balance: number; by_method: any[]; transactions: any[] } | null>(null);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [preselectedInvoice, setPreselectedInvoice] = useState<Invoice | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [
        s,
        dash,
        prods,
        sups,
        custs,
        purs,
        sls,
        dels,
        quots,
        invs,
        pays,
        exps,
        csh,
        adjs,
        movs,
        usrs,
      ] = await Promise.all([
        api.getSettings(),
        api.getDashboard(),
        api.getProducts(),
        api.getSuppliers(),
        api.getCustomers(),
        api.getPurchases(),
        api.getSales(),
        api.getDeliveries(),
        api.getQuotations(),
        api.getInvoices(),
        api.getPayments(),
        api.getExpenses(),
        api.getCashFlow(),
        api.getInventoryAdjustments(),
        api.getAllStockMovements(),
        api.getUsers(),
      ]);

      setSettings(s);
      setDashboardStats(dash);
      setProducts(prods);
      setSuppliers(sups);
      setCustomers(custs);
      setPurchases(purs);
      setSales(sls);
      setDeliveries(dels);
      setQuotations(quots);
      setInvoices(invs);
      setPayments(pays);
      setExpenses(exps);
      setCashFlow(csh);
      setAdjustments(adjs);
      setStockMovements(movs);
      setUsers(usrs);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle cross-module quick actions
  const handleQuickNewSale = () => {
    setActiveTab('sales');
  };

  const handleQuickNewPurchase = () => {
    setActiveTab('purchases');
  };

  const handlePayInvoice = (inv: Invoice) => {
    setPreselectedInvoice(inv);
    setActiveTab('cash');
  };

  const getSectionTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Tableau de Bord Commercial & Stocks';
      case 'products':
        return 'Gestion des Références de Ciment';
      case 'stock_movements':
        return 'Journal Général des Mouvements de Stock';
      case 'purchases':
        return 'Approvisionnements & Réceptions Usine';
      case 'sales':
        return 'Ventes Comptoir & Chantiers';
      case 'deliveries':
        return 'Suivi des Livraisons & Déchargements';
      case 'quotations':
        return 'Édition & Suivi des Devis';
      case 'invoices':
        return 'Facturation Commerciale';
      case 'cash':
        return 'Recettes & Caisse en Temps Réel';
      case 'expenses':
        return 'Dépenses & Frais du Dépôt';
      case 'partners':
        return 'Répertoire Clients & Fournisseurs';
      case 'inventory':
        return 'Inventaire Physique & Régularisations';
      case 'reports':
        return 'Rapports Financiers & Balances Périodiques';
      case 'users':
        return "Utilisateurs & Contrôle d'Accès (RBAC)";
      case 'settings':
        return "Paramètres de l'Entreprise & Données";
      case 'guide':
        return "Manuel d'Utilisation & Procédures CIMENPRO";
      default:
        return 'CIMENPRO';
    }
  };

  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock).length;
  const unpaidInvoicesCount = invoices.filter(i => i.payment_status !== 'payee' && i.status === 'validee').length;

  // Determine permissions based on active role
  const canEditProducts = ['admin', 'gestionnaire_stock', 'responsable'].includes(currentUserRole);
  const canEditPurchases = ['admin', 'gestionnaire_stock', 'responsable'].includes(currentUserRole);
  const canEditSales = ['admin', 'commercial', 'caissier', 'responsable'].includes(currentUserRole);
  const canEditDeliveries = ['admin', 'gestionnaire_stock', 'commercial', 'responsable'].includes(currentUserRole);
  const canEditQuotes = ['admin', 'commercial', 'responsable'].includes(currentUserRole);
  const canEditInvoices = ['admin', 'commercial', 'caissier', 'responsable'].includes(currentUserRole);
  const canEditCash = ['admin', 'caissier', 'responsable'].includes(currentUserRole);
  const canEditExpenses = ['admin', 'caissier', 'responsable'].includes(currentUserRole);
  const canEditPartners = ['admin', 'commercial', 'responsable'].includes(currentUserRole);
  const canEditInventory = ['admin', 'gestionnaire_stock', 'responsable'].includes(currentUserRole);
  const canEditSettings = ['admin'].includes(currentUserRole);
  const canEditUsers = ['admin'].includes(currentUserRole);

  if (!settings && loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-xl animate-bounce">
          C
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold">CIMENPRO</h1>
          <p className="text-xs text-slate-400 mt-1">Connexion à la base de données relationnelle...</p>
        </div>
      </div>
    );
  }

  const currentSettings = settings || {
    id: 1,
    company_name: 'CIMENPRO',
    tagline: 'Vente en gros et détail de ciment certifié',
    logo_url: '',
    address: 'Avenue de l\'Indépendance',
    city: 'Brazzaville',
    country: 'République du Congo',
    phone: '+242 06 654 32 10',
    email: 'contact@cimenpro.cg',
    currency: 'FCFA',
    prefix_quote: 'DEV-',
    prefix_invoice: 'FAC-',
    prefix_receipt: 'REC-',
    prefix_delivery: 'BL-',
    prefix_purchase: 'BR-',
    low_stock_threshold: 150,
    timezone: 'Africa/Brazzaville',
    footer_note: 'Paiement avant déchargement. Pas de reprise des sacs ouverts.',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row font-sans text-slate-900">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        currentUserRole={currentUserRole}
        lowStockCount={lowStockCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          currentTitle={getSectionTitle(activeTab)}
          onQuickNewSale={handleQuickNewSale}
          onOpenGuide={() => setActiveTab('guide')}
          currentUserRole={currentUserRole}
          onRoleChange={setCurrentUserRole}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              loading={loading}
              onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
              onQuickNewSale={handleQuickNewSale}
              onQuickNewPurchase={handleQuickNewPurchase}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              suppliers={suppliers}
              onRefresh={loadData}
              canEdit={canEditProducts}
            />
          )}

          {activeTab === 'stock_movements' && (
            <StockMovementsView
              movements={stockMovements}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              purchases={purchases}
              products={products}
              suppliers={suppliers}
              settings={currentSettings}
              onRefresh={loadData}
              canEdit={canEditPurchases}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={sales}
              products={products}
              customers={customers}
              settings={currentSettings}
              invoices={invoices}
              onRefresh={loadData}
              canEdit={canEditSales}
            />
          )}

          {activeTab === 'deliveries' && (
            <DeliveriesView
              deliveries={deliveries}
              settings={currentSettings}
              onRefresh={loadData}
              canEdit={canEditDeliveries}
            />
          )}

          {activeTab === 'quotations' && (
            <QuotationsView
              quotations={quotations}
              products={products}
              customers={customers}
              settings={currentSettings}
              onRefresh={loadData}
              canEdit={canEditQuotes}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              settings={currentSettings}
              onRefresh={loadData}
              onPayInvoice={handlePayInvoice}
              canEdit={canEditInvoices}
            />
          )}

          {activeTab === 'cash' && (
            <CashView
              payments={payments}
              cashFlow={cashFlow}
              invoices={invoices}
              customers={customers}
              settings={currentSettings}
              onRefresh={loadData}
              canEdit={canEditCash}
              preselectedInvoice={preselectedInvoice}
              onClearPreselected={() => setPreselectedInvoice(null)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              onRefresh={loadData}
              canEdit={canEditExpenses}
            />
          )}

          {activeTab === 'partners' && (
            <PartnersView
              customers={customers}
              suppliers={suppliers}
              onRefresh={loadData}
              canEdit={canEditPartners}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              adjustments={adjustments}
              products={products}
              onRefresh={loadData}
              canEdit={canEditInventory}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              products={products}
              settings={currentSettings}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              onRefresh={loadData}
              canEdit={canEditUsers}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={currentSettings}
              onRefresh={loadData}
              canEdit={canEditSettings}
            />
          )}

          {activeTab === 'guide' && (
            <UserGuideView
              currentUserRole={currentUserRole}
              onNavigateTab={setActiveTab}
              settings={currentSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
