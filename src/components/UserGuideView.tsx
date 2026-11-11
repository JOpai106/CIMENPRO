import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  Package,
  ShoppingCart,
  Wallet,
  Truck,
  ShieldCheck,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Phone,
  Building,
} from 'lucide-react';
import { CompanySettings, UserRole } from '../types';
import { NavTab } from './Sidebar';
import { exportUserGuidePDF } from '../utils/pdfGenerator';

interface UserGuideViewProps {
  currentUserRole: UserRole;
  onNavigateTab: (tab: NavTab) => void;
  settings: CompanySettings;
}

interface GuideSection {
  id: string;
  role: 'all' | UserRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText: string;
  badgeColor: string;
  steps: {
    title: string;
    description: string;
    proTip?: string;
    warning?: string;
    targetTab?: NavTab;
    targetTabLabel?: string;
  }[];
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  roles: string[];
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({
  currentUserRole,
  onNavigateTab,
  settings,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({
    'intro-general': true,
    'stock-reception': true,
    'sales-standard': true,
    'cash-receipt': true,
    'admin-supervision': true,
  });
  const [expandedFaqIds, setExpandedFaqIds] = useState<Record<string, boolean>>({
    'faq-1': true,
  });

  const toggleSection = (id: string) => {
    setExpandedSectionIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allSecs: Record<string, boolean> = {};
    guideSections.forEach(s => (allSecs[s.id] = true));
    setExpandedSectionIds(allSecs);
  };

  const collapseAll = () => {
    setExpandedSectionIds({});
  };

  const guideSections: GuideSection[] = [
    {
      id: 'intro-general',
      role: 'all',
      title: '1. Principes Généraux de CIMENPRO',
      subtitle: 'Prise en main, règles fondamentales et navigation dans l\'application',
      icon: BookOpen,
      badgeText: 'Tronc Commun',
      badgeColor: 'bg-blue-600',
      steps: [
        {
          title: 'Unité de gestion unique : Le Sac de Ciment',
          description:
            'Toutes les opérations d\'achat, de vente, de stockage et d\'inventaire sont comptabilisées en sacs unitaires de 50 kg (ou conditionnement spécifique). Les prix sont exprimés en Francs CFA (FCFA / XAF) sans calcul automatique de TVA conformément aux directives de gestion simplifiée.',
          proTip: 'Pour convertir un tonnage en sacs : 1 tonne = 20 sacs de 50 kg. Exemple : 40 tonnes = 800 sacs.',
        },
        {
          title: 'Gestion des rôles et contrôle d\'accès (RBAC)',
          description:
            'L\'accès aux modules est sécurisé selon le poste de chaque collaborateur (Administrateur, Gestionnaire Stock, Commercial, Caissière, Responsable Dépôt). Un sélecteur en haut à droite permet de visualiser vos droits et basculer en mode test.',
          targetTab: 'dashboard',
          targetTabLabel: 'Voir le Tableau de Bord',
        },
        {
          title: 'Exportations PDF et sauvegardes CSV',
          description:
            'Chaque document (Devis, Facture, Bon de Livraison, Bon de Réception, Reçu de Caisse, Rapport) peut être imprimé ou téléchargé au format PDF aux couleurs de CIMENPRO. Tous les tableaux de données sont également exportables en CSV/Excel.',
        },
      ],
    },
    {
      id: 'stock-reception',
      role: 'gestionnaire_stock',
      title: '2. Réception Usine & Entrée en Stock',
      subtitle: 'Procédure complète de déchargement d\'un camion de ciment fournisseur',
      icon: Truck,
      badgeText: 'Gestionnaire Stock',
      badgeColor: 'bg-indigo-600',
      steps: [
        {
          title: 'Étape 1 : Vérification physique à l\'arrivée du camion',
          description:
            'Avant de décharger, comparer le bon de livraison chauffeur (fournisseur CIMAF, DANGOTE, SOCIMAT, etc.) avec la marchandise réelle. Vérifier l\'état des bâches de protection et l\'absence de sacs mouillés ou éventrés.',
          warning: 'Ne jamais signer un bon de livraison fournisseur sans avoir compté le nombre effectif de palettes et de sacs.',
        },
        {
          title: 'Étape 2 : Enregistrement de la réception dans CIMENPRO',
          description:
            'Accéder au module "Approvisionnements", cliquer sur "Nouvelle Réception". Renseigner la date, le fournisseur, le produit reçu (ex: CIMAF CPJ 35), la quantité de sacs livrée, le prix d\'achat unitaire convenu et la référence du bon fournisseur.',
          proTip: 'La saisie met instantanément à jour le stock disponible physique et recalcule le Coût Moyen Pondéré (CMP).',
          targetTab: 'purchases',
          targetTabLabel: 'Accéder aux Approvisionnements',
        },
        {
          title: 'Étape 3 : Traitement des réceptions partielles',
          description:
            'Si le camion n\'apporte qu\'une partie de la commande (ex: 600 sacs sur 1 000 commandés), saisir uniquement les sacs effectivement déchargés. Renseigner dans les observations la date prévue du second camion.',
        },
        {
          title: 'Étape 4 : Impression du Bon de Réception Interne (BR)',
          description:
            'Générer et imprimer le Bon de Réception CIMENPRO. Faire signer le chauffeur livreur et conserver le double au classeur de magasinage.',
        },
      ],
    },
    {
      id: 'stock-inventory',
      role: 'gestionnaire_stock',
      title: '3. Inventaire Physique & Ajustements de Stock',
      subtitle: 'Comptage périodique, traitement des avaries et régularisation des écarts',
      icon: Layers,
      badgeText: 'Gestionnaire Stock',
      badgeColor: 'bg-indigo-600',
      steps: [
        {
          title: 'Comptage physique des piles de sacs',
          description:
            'Effectuer le comptage de chaque travée du hangar par produit et par marque. Noter le nombre de sacs intacts, de sacs perforés et de sacs pris en masse (mouillés).',
        },
        {
          title: 'Saisie de la régularisation d\'inventaire',
          description:
            'Dans le module "Inventaire physique", cliquer sur "Régularisation d\'inventaire". Sélectionner le ciment concerné, le type de mouvement (Entrée de correction, Perte, Rebut, Vol, Avarie humidité) et la quantité en écart.',
          warning: 'Tout ajustement est audité et horodaté avec le nom de l\'utilisateur responsable pour éviter toute fraude.',
          targetTab: 'inventory',
          targetTabLabel: 'Ouvrir l\'Inventaire Physique',
        },
        {
          title: 'Surveillance des alertes de stock minimum',
          description:
            'Consulter régulièrement l\'onglet "Produits" ou le Tableau de bord. Les produits sous le seuil d\'alerte (ex: moins de 150 sacs) s\'affichent avec un badge orange clignotant.',
          targetTab: 'products',
          targetTabLabel: 'Vérifier les Niveaux de Stock',
        },
      ],
    },
    {
      id: 'sales-standard',
      role: 'commercial',
      title: '4. Ventes Comptoir & Livraisons sur Chantiers',
      subtitle: 'Création d\'un devis, validation d\'une commande et planification du transport',
      icon: ShoppingCart,
      badgeText: 'Commercial',
      badgeColor: 'bg-emerald-600',
      steps: [
        {
          title: 'Étape 1 : Établissement d\'un Devis proforma',
          description:
            'Pour un entrepreneur BTP ou un client demandant une offre de prix, créer un devis dans "Devis". Sélectionner le client, ajouter les références de ciment et fixer la durée de validité (ex: 7 jours). Le devis ne réserve aucun sac tant qu\'il n\'est pas accepté.',
          targetTab: 'quotations',
          targetTabLabel: 'Créer un Devis',
        },
        {
          title: 'Étape 2 : Vente au comptoir (Emporté immédiat)',
          description:
            'Si le client charge immédiatement ses sacs dans son propre véhicule au dépôt, sélectionner le mode "Remise immédiate au client (Sortie directe)". Les sacs sont déduits du stock disponible en temps réel dès la validation de la vente.',
          targetTab: 'sales',
          targetTabLabel: 'Enregistrer une Vente',
        },
        {
          title: 'Étape 3 : Vente avec livraison différée sur chantier',
          description:
            'Si le ciment doit être acheminé sur un chantier par les camions du dépôt, cocher l\'option "Livraison ultérieure sur chantier". La quantité commandée est alors placée en "Stock Réservé". Les sacs ne quittent le stock physique qu\'au moment où le chauffeur part avec le Bon de Livraison.',
          proTip: 'Cette règle garantit qu\'un même sac de ciment ne peut jamais être vendu deux fois par mégarde !',
        },
        {
          title: 'Étape 4 : Émission du Bon de Livraison (BL) et suivi',
          description:
            'Dans l\'onglet "Livraisons", créer un BL pour chaque rotation de camion. Indiquer le chauffeur, l\'immatriculation du véhicule, l\'adresse du chantier et la quantité transportée (ex: 200 sacs sur une commande de 600).',
          targetTab: 'deliveries',
          targetTabLabel: 'Suivre les Livraisons',
        },
      ],
    },
    {
      id: 'cash-receipt',
      role: 'caissier',
      title: '5. Encaissements, Caisse & Décaissements',
      subtitle: 'Gestion des paiements Espèces / Mobile Money, reçus et menues dépenses',
      icon: Wallet,
      badgeText: 'Caissier(ère)',
      badgeColor: 'bg-amber-600',
      steps: [
        {
          title: 'Étape 1 : Encaissement d\'une vente ou facture',
          description:
            'Accéder au module "Recettes & Caisse". Sélectionner la facture ou vente concernée. Indiquer le montant versé et le mode de règlement :',
          proTip: 'Modes acceptés : Espèces, Mobile Money (MTN MoMo ou Airtel Money), Virement BGFI Congo, Chèque.',
          targetTab: 'cash',
          targetTabLabel: 'Ouvrir le Module Caisse',
        },
        {
          title: 'Étape 2 : Vérification rigoureuse des transactions Mobile Money',
          description:
            'Pour tout règlement par MTN MoMo ou Airtel Money, exiger la notification SMS de confirmation sur le téléphone officiel du dépôt et renseigner impérativement la Référence de transaction (ID Transaction).',
          warning: 'Ne jamais valider un reçu sur simple capture d\'écran présentée par un client sans confirmation sur le terminal du dépôt.',
        },
        {
          title: 'Étape 3 : Impression du Reçu de Caisse officiel',
          description:
            'Dès validation, générer le reçu de caisse sécurisé. Le montant encaissé, le solde restant dû du client et le nom du caissier y figurent automatiquement.',
        },
        {
          title: 'Étape 4 : Gestion des dépenses et frais du dépôt',
          description:
            'Pour tout décaissement de la caisse (manutentionnaires/chargeurs de sacs, carburant camion, fournitures, loyer hangar), enregistrer la sortie dans "Dépenses du dépôt" avec pièce justificative.',
          targetTab: 'expenses',
          targetTabLabel: 'Gérer les Dépenses',
        },
        {
          title: 'Étape 5 : Clôture journalière de caisse',
          description:
            'En fin de journée, comparer le solde physique dans le tiroir-caisse avec le solde théorique affiché par CIMENPRO. Imprimer le journal de caisse du jour pour transmission au responsable.',
        },
      ],
    },
    {
      id: 'admin-supervision',
      role: 'admin',
      title: '6. Administration, Tarifs, Rapports & Paramètres',
      subtitle: 'Supervision financière, marges, utilisateurs et configuration de l\'entreprise',
      icon: ShieldCheck,
      badgeText: 'Admin & Responsable',
      badgeColor: 'bg-slate-900',
      steps: [
        {
          title: 'Supervision du Tableau de Bord exécutif',
          description:
            'Consulter en temps réel la valorisation du stock au CMP, le CA journalier/mensuel, le bénéfice brut estimé et la balance des créances clients en retard.',
          targetTab: 'dashboard',
          targetTabLabel: 'Consulter le Tableau de Bord',
        },
        {
          title: 'Mise à jour des prix d\'achat et prix de vente',
          description:
            'En cas de fluctuation tarifaire des usines (CIMAF, Dangote, etc.), mettre à jour le prix de vente public et le prix grossiste dans "Produits (Ciment)" pour préserver la marge commerciale.',
          targetTab: 'products',
          targetTabLabel: 'Gérer les Prix des Ciments',
        },
        {
          title: 'Rapports périodiques & Balance des comptes',
          description:
            'Générer dans l\'onglet "Rapports & Bilan" la balance commerciale détaillée (ventes, encaissements, dépenses décaissées, bénéfice net d\'exploitation) et exporter l\'état comptable en CSV.',
          targetTab: 'reports',
          targetTabLabel: 'Voir les Rapports Financiers',
        },
        {
          title: 'Gestion des accès et utilisateurs',
          description:
            'Créer les comptes des nouveaux magasiniers, commerciaux ou caissières dans "Utilisateurs & Droits". Assigner les rôles appropriés pour restreindre l\'accès aux fonctions sensibles.',
          targetTab: 'users',
          targetTabLabel: 'Gérer les Utilisateurs',
        },
        {
          title: 'Paramétrage des coordonnées et mentions légales',
          description:
            'Modifier l\'adresse du dépôt, les numéros de téléphone MoMo/Airtel, les coordonnées bancaires BGFI et le pied de page des factures dans "Paramètres du Dépôt".',
          targetTab: 'settings',
          targetTabLabel: 'Ouvrir les Paramètres',
        },
      ],
    },
  ];

  const faqList: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'Stock & Manutention',
      question: 'Que faire en cas de sacs déchirés ou éventrés lors du déchargement d\'un camion ?',
      answer:
        'Si des sacs sont endommagés par le transporteur avant déchargement, les faire constater au chauffeur et les déduire du Bon de Réception (ne réceptionner que les sacs conformes). Si un sac est percé par erreur de manipulation dans le hangar, enregistrer une "Régularisation d\'inventaire" avec le motif "Avarie / Rebut" pour ajuster le stock physique.',
      roles: ['gestionnaire_stock', 'responsable', 'admin'],
    },
    {
      id: 'faq-2',
      category: 'Ventes & Livraisons',
      question: 'Quelle est la différence entre "Remise immédiate" et "Livraison ultérieure" ?',
      answer:
        'La remise immédiate déduit immédiatement les sacs du stock physique disponible (le client repart directement avec son ciment). La livraison ultérieure place la marchandise en "Stock Réservé" : les sacs restent physiquement au dépôt mais ne peuvent plus être vendus à un autre client, puis sont déduits au fur et à mesure de l\'émission des Bons de Livraison (BL).',
      roles: ['commercial', 'gestionnaire_stock', 'admin'],
    },
    {
      id: 'faq-3',
      category: 'Caisse & Règlements',
      question: 'Un client peut-il payer une partie en espèces et une partie par Mobile Money ?',
      answer:
        'Oui, parfaitement ! Vous pouvez enregistrer deux paiements successifs rattachés à la même facture : un premier versement en sélectionnant le mode "Espèces", puis un second versement pour le solde en sélectionnant "Mobile Money" avec le numéro de transaction. La facture passera automatiquement en statut "Payée".',
      roles: ['caissier', 'commercial', 'admin'],
    },
    {
      id: 'faq-4',
      category: 'Devis & Factures',
      question: 'L\'édition d\'un devis bloque-t-elle des sacs de ciment dans le stock ?',
      answer:
        'Non. Un devis est une simple proposition commerciale sans impact sur les quantités en stock. Le stock n\'est réservé ou déduit que lorsque le devis est validé et converti en Vente ou Facture.',
      roles: ['commercial', 'admin'],
    },
    {
      id: 'faq-5',
      category: 'Comptabilité & Dépenses',
      question: 'Comment sont rémunérés les porteurs et chargeurs de ciment ?',
      answer:
        'Chaque paiement versé aux manutentionnaires pour le chargement ou déchargement de sacs doit être saisi dans "Dépenses du dépôt" sous la catégorie "Manutention & Chargeurs". Cela diminue automatiquement le solde de la caisse physique du dépôt et permet un calcul exact du bénéfice net.',
      roles: ['caissier', 'responsable', 'admin'],
    },
    {
      id: 'faq-6',
      category: 'Sécurité & Sauvegardes',
      question: 'Les données de CIMENPRO sont-elles conservées en cas de coupure de courant ?',
      answer:
        'Oui. Toutes les opérations sont enregistrées dans la base de données relationnelle locale et sécurisée. Dès qu\'une opération est validée, elle est stockée de manière permanente.',
      roles: ['all'],
    },
  ];

  // Filtering logic
  const filteredSections = useMemo(() => {
    return guideSections.filter(section => {
      const matchRole =
        selectedRoleFilter === 'all' ||
        section.role === 'all' ||
        section.role === selectedRoleFilter;

      if (!matchRole) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = section.title.toLowerCase().includes(q);
      const inSubtitle = section.subtitle.toLowerCase().includes(q);
      const inSteps = section.steps.some(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.proTip && s.proTip.toLowerCase().includes(q)) ||
          (s.warning && s.warning.toLowerCase().includes(q))
      );

      return inTitle || inSubtitle || inSteps;
    });
  }, [guideSections, selectedRoleFilter, searchQuery]);

  const filteredFaqs = useMemo(() => {
    return faqList.filter(faq => {
      const matchRole =
        selectedRoleFilter === 'all' ||
        faq.roles.includes('all') ||
        faq.roles.includes(selectedRoleFilter);

      if (!matchRole) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q)
      );
    });
  }, [faqList, selectedRoleFilter, searchQuery]);

  const handleDownloadPDF = () => {
    exportUserGuidePDF(settings);
  };

  const handlePrint = () => {
    window.print();
  };

  const roleFilters: { id: 'all' | UserRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'Tous les Rôles', icon: BookOpen },
    { id: 'gestionnaire_stock', label: 'Gestionnaire Stock', icon: Truck },
    { id: 'commercial', label: 'Commercial & Vente', icon: ShoppingCart },
    { id: 'caissier', label: 'Caisse & Recettes', icon: Wallet },
    { id: 'responsable', label: 'Responsable Dépôt', icon: ShieldCheck },
    { id: 'admin', label: 'Administrateur', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-slate-900 rounded-xl p-6 sm:p-7 text-white border border-slate-800 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
              Centre de Documentation Officiel
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-300 text-xs font-medium">CIMENPRO v2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Manuel d'Utilisation & Procédures Métier
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Guide d'exploitation complet pour la réception des camions de ciment, la gestion des stocks, la vente comptoir, les livraisons sur chantiers, les encaissements Mobile Money/espèces et la clôture de caisse.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              Télécharger le Manuel Complet (PDF)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimer cette page
            </button>
          </div>
        </div>
      </div>

      {/* Role Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une opération (ex: réception, Mobile Money, sac percé, devis, livraison)..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Collapse / Expand Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 text-xs">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Tout développer
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Tout réduire
            </button>
          </div>
        </div>

        {/* Role Filter Buttons */}
        <div>
          <span className="text-xs font-semibold text-slate-600 block mb-2">Filtrer par profil métier :</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {roleFilters.map(rf => {
              const Icon = rf.icon;
              const isActive = selectedRoleFilter === rf.id;
              return (
                <button
                  key={rf.id}
                  onClick={() => setSelectedRoleFilter(rf.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {rf.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Workflow Cards: The 4 Core Circuits */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Circuit 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
            01
          </div>
          <h2 className="text-sm font-bold text-slate-900">Circuit Approvisionnement</h2>
          <p className="text-xs text-slate-600 mt-1 mb-3">Du camion usine à la mise en pile au hangar.</p>
          <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-indigo-700">1.</span>
              <span>Arrivée camion & contrôle sacs</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-indigo-700">2.</span>
              <span>Enregistrement BR Appro</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-indigo-700">3.</span>
              <span>Incrément stock & calcul CMP</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('purchases')}
            className="mt-3 w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
          >
            Aller aux Approvisionnements <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circuit 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs mb-3">
            02
          </div>
          <h2 className="text-sm font-bold text-slate-900">Circuit Vente & Chantier</h2>
          <p className="text-xs text-slate-600 mt-1 mb-3">Commande, réservation et rotation camions.</p>
          <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-emerald-700">1.</span>
              <span>Devis proforma ou vente</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-emerald-700">2.</span>
              <span>Réservation automatique stock</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-emerald-700">3.</span>
              <span>Émission Bon de Livraison (BL)</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('sales')}
            className="mt-3 w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
          >
            Aller aux Ventes <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circuit 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs mb-3">
            03
          </div>
          <h2 className="text-sm font-bold text-slate-900">Circuit Caisse & MoMo</h2>
          <p className="text-xs text-slate-600 mt-1 mb-3">Encaissement comptant et vérification SMS.</p>
          <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-amber-700">1.</span>
              <span>Sélection facture ou vente</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-amber-700">2.</span>
              <span>Validation ID transaction MoMo</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-amber-700">3.</span>
              <span>Émission du reçu de caisse</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('cash')}
            className="mt-3 w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
          >
            Aller à la Caisse <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circuit 4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs mb-3">
            04
          </div>
          <h2 className="text-sm font-bold text-slate-900">Circuit Inventaire & Écarts</h2>
          <p className="text-xs text-slate-600 mt-1 mb-3">Comptage physique et audit des écarts.</p>
          <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-rose-700">1.</span>
              <span>Comptage physique des piles</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-rose-700">2.</span>
              <span>Constat d'écart / avarie</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-rose-700">3.</span>
              <span>Régularisation avec motif</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="mt-3 w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors"
          >
            Aller à l'Inventaire <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Procedural Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Procédures Opérationnelles Détaillées ({filteredSections.length})
          </h2>
          <span className="text-xs text-slate-500">
            Cliquez sur un titre pour afficher ou masquer les détails
          </span>
        </div>

        {filteredSections.map(section => {
          const isExpanded = !!expandedSectionIds[section.id];
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-sm ${section.badgeColor}`}>
                        {section.badgeText}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                        {section.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                  </div>
                </div>

                <div className="shrink-0 text-slate-400">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 sm:p-6 bg-slate-50/40 space-y-4">
                  {section.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{step.title}</h4>
                        </div>
                        {step.targetTab && (
                          <button
                            onClick={() => onNavigateTab(step.targetTab!)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline shrink-0"
                          >
                            <span>{step.targetTabLabel || 'Ouvrir'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pl-7">{step.description}</p>

                      {step.proTip && (
                        <div className="ml-7 flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md text-blue-900 text-[11px]">
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Conseil pratique CIMENPRO : </span>
                            {step.proTip}
                          </div>
                        </div>
                      )}

                      {step.warning && (
                        <div className="ml-7 flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-900 text-[11px]">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Point de vigilance critique : </span>
                            {step.warning}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Foire Aux Questions Opérationnelle (FAQ Dépôt)
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Réponses directes aux situations récurrentes vécues sur le terrain par l'équipe du dépôt.
        </p>

        <div className="space-y-3 pt-2">
          {filteredFaqs.map(faq => {
            const isFaqOpen = !!expandedFaqIds[faq.id];
            return (
              <div
                key={faq.id}
                className="border border-slate-200 rounded-lg overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3 text-xs font-bold text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      [{faq.category}]
                    </span>
                    <span>{faq.question}</span>
                  </div>
                  {isFaqOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isFaqOpen && (
                  <div className="p-3.5 bg-white text-xs text-slate-700 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Assistance & Contacts Footer */}
      <div className="bg-slate-100 rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Besoin d'une assistance ou d'un dépannage ?
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Contactez l'administration centrale de CIMENPRO ou le superviseur du dépôt de Brazzaville.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {settings.phone || '+242 06 654 32 10'}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              {settings.city || 'Brazzaville'}, {settings.country || 'Congo'}
            </span>
          </div>
        </div>

        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shrink-0 shadow-xs"
        >
          <Download className="w-4 h-4" />
          Guide PDF pour impression
        </button>
      </div>
    </div>
  );
};
