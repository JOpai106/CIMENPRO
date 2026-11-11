import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Download, Printer, RefreshCw, Layers, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { CompanySettings, Product } from '../types';
import { formatFCFA, formatBags, formatDateFr } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsViewProps {
  products: Product[];
  settings: CompanySettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  settings,
}) => {
  const [periodPreset, setPeriodPreset] = useState<'day' | 'week' | 'month' | 'custom'>('month');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const sevenDaysStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedProduct, setSelectedProduct] = useState('');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports({
        startDate,
        endDate,
        productId: selectedProduct || undefined,
      });
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedProduct]);

  const handlePresetChange = (preset: 'day' | 'week' | 'month' | 'custom') => {
    setPeriodPreset(preset);
    if (preset === 'day') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      setStartDate(sevenDaysStr);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const kpis = reportData.kpis;
    const headers = ['Indicateur', 'Valeur'];
    const rows = [
      ['Période du', formatDateFr(reportData.period.start)],
      ['Période au', formatDateFr(reportData.period.end)],
      ['Quantité Reçue (Approvisionnements)', `${kpis.received_bags} sacs`],
      ['Quantité Livrée (Chantiers)', `${kpis.delivered_bags} sacs`],
      ['Quantité Vendue', `${kpis.sold_bags} sacs`],
      ['Stock Actuel Disponible', `${kpis.current_stock} sacs`],
      ["Chiffre d'Affaires (CA)", `${kpis.turnover_ca} FCFA`],
      ['Recettes Encaissées', `${kpis.receipts_collected} FCFA`],
      ['Dépenses Enregistrées', `${kpis.expenses_total} FCFA`],
      ['Créances Générées (Reste Dû)', `${kpis.customer_debts} FCFA`],
      ['Coût des Marchandises Vendues (CMV)', `${kpis.cogs} FCFA`],
      ['Bénéfice Brut Estimé', `${kpis.gross_margin} FCFA`],
      ['Nombre de Ventes', kpis.sales_count],
      ['Nombre de Factures', kpis.invoices_count],
    ];
    exportToCSV(`rapport_commercial_ciment_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const kpis = reportData.kpis;

    // Header Navy
    doc.setFillColor(15, 43, 70);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 26, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings.company_name.toUpperCase(), 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`RAPPORT DE GESTION & BILAN COMMERCIAL (${formatDateFr(startDate)} au ${formatDateFr(endDate)})`, 14, 19);

    // Summary table
    const tableData = [
      ['Sacs de ciment reçus (Entrées usine)', `${formatBags(kpis.received_bags)}`],
      ['Sacs de ciment vendus', `${formatBags(kpis.sold_bags)}`],
      ['Sacs de ciment effectivement livrés', `${formatBags(kpis.delivered_bags)}`],
      ['Stock disponible en magasin', `${formatBags(kpis.current_stock)}`],
      ["Chiffre d'Affaires Total (CA)", `${formatFCFA(kpis.turnover_ca)}`],
      ['Recettes effectivement encaissées', `${formatFCFA(kpis.receipts_collected)}`],
      ["Dépenses d'exploitation décaissées", `${formatFCFA(kpis.expenses_total)}`],
      ['Créances clients restantes (Dettes)', `${formatFCFA(kpis.customer_debts)}`],
      ["Coût d'Achat des Marchandises Vendues (CMV)", `${formatFCFA(kpis.cogs)}`],
      ['Bénéfice Brut Estimé (CA - CMV)', `${formatFCFA(kpis.gross_margin)}`],
    ];

    autoTable(doc, {
      startY: 34,
      head: [['Indicateur Clé de Gestion', 'Résultat Période']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 43, 70], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3.5 },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 130;

    // Top selling products table
    if (reportData.top_products && reportData.top_products.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 43, 70);
      doc.text('Classement des Ventes par Produit / Marque', 14, finalY + 12);

      const prodData = reportData.top_products.map((p: any, idx: number) => [
        idx + 1,
        p.name,
        p.brand,
        `${p.total_bags} sacs`,
        formatFCFA(p.total_amount),
      ]);

      autoTable(doc, {
        startY: finalY + 16,
        head: [['#', 'Produit', 'Marque', 'Volume Vendu', "Chiffre d'Affaires"]],
        body: prodData,
        theme: 'striped',
        headStyles: { fillColor: [70, 85, 105], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5 },
        columnStyles: {
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
      });
    }

    doc.save(`rapport_gestion_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rapports & Bilan Périodique</h2>
          <p className="text-xs text-slate-500">
            États financiers et balances de stocks journaliers, hebdomadaires et mensuels (Fuseau : Africa/Brazzaville).
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
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Télécharger Rapport PDF
          </button>
        </div>
      </div>

      {/* Preset and Date range filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => handlePresetChange('day')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                periodPreset === 'day' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rapport Journalier
            </button>
            <button
              onClick={() => handlePresetChange('week')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                periodPreset === 'week' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rapport Hebdomadaire
            </button>
            <button
              onClick={() => handlePresetChange('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                periodPreset === 'month' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rapport Mensuel
            </button>
            <button
              onClick={() => setPeriodPreset('custom')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                periodPreset === 'custom' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personnalisé
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
            title="Actualiser le rapport"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Du :</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Au :</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Filtrer Produit :</span>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="">Tous les produits</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !reportData ? (
        <div className="py-12 text-center text-slate-400 text-xs">Calcul des statistiques du rapport...</div>
      ) : (
        <div className="space-y-6">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Chiffre d'Affaires Validé</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {formatFCFA(reportData.kpis.turnover_ca)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                {reportData.kpis.sales_count} vente(s) enregistrée(s)
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Recettes Encaissées</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                {formatFCFA(reportData.kpis.receipts_collected)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Argent effectivement en caisse
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Dépenses Exploitation</span>
              <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
                {formatFCFA(reportData.kpis.expenses_total)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Manutention, gasoil, salaires...
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Bénéfice Brut Estimé</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {formatFCFA(reportData.kpis.gross_margin)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                CA - Coût d'achat CMV
              </span>
            </div>
          </div>

          {/* Stocks Balances during period */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Bilan des Flux de Sacs de Ciment sur la Période
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block uppercase">Approvisionnements Reçus</span>
                <span className="text-lg font-bold font-mono text-emerald-600 mt-1 block">
                  +{formatBags(reportData.kpis.received_bags)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block uppercase">Ventes Totales</span>
                <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                  {formatBags(reportData.kpis.sold_bags)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block uppercase">Livraisons Effectives</span>
                <span className="text-lg font-bold font-mono text-orange-600 mt-1 block">
                  {formatBags(reportData.kpis.delivered_bags)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block uppercase">Stock Restant Dépôt</span>
                <span className="text-lg font-bold font-mono text-blue-600 mt-1 block">
                  {formatBags(reportData.kpis.current_stock)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          {reportData.top_products && reportData.top_products.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Classement des Produits les Plus Vendus
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Rang</th>
                      <th className="py-2.5 px-4">Désignation</th>
                      <th className="py-2.5 px-4">Marque</th>
                      <th className="py-2.5 px-4 text-right">Volume (Sacs)</th>
                      <th className="py-2.5 px-4 text-right">Chiffre d'Affaires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.top_products.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{p.brand}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                          {formatBags(p.total_bags)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatFCFA(p.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
