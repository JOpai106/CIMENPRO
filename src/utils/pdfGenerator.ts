import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Quotation, Invoice, Delivery, Purchase, Payment } from '../types';
import { formatFCFA, formatDateFr } from './formatters';

const PRIMARY_COLOR: [number, number, number] = [15, 43, 70]; // Navy Blue #0f2b46
const ACCENT_COLOR: [number, number, number] = [234, 88, 12]; // Orange #ea580c

function drawHeader(doc: jsPDF, settings: CompanySettings, docTitle: string, docNumber: string, docDate: string) {
  // Top brand band
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, 210, 28, 'F');

  // Orange accent strip
  doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.rect(0, 28, 210, 2, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.company_name.toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings.tagline || 'Distribution & Vente de Ciment Certifié', 14, 19);
  doc.text(`${settings.city}, ${settings.country} · Tél: ${settings.phone}`, 14, 24);

  // Document Title Box (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(docTitle.toUpperCase(), 196, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`N°: ${docNumber}`, 196, 19, { align: 'right' });
  doc.text(`Date: ${formatDateFr(docDate)}`, 196, 24, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

function drawFooter(doc: jsPDF, settings: CompanySettings) {
  const pageHeight = doc.internal.pageSize.height;

  // Thin separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, 196, pageHeight - 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);

  const footerText = settings.footer_note || 'Les marchandises livrées ne sont ni reprises ni échangées après contrôle.';
  doc.text(footerText, 14, pageHeight - 15);

  const legal = `${settings.company_name} · NIF: ${settings.nif || 'N/A'} · Tél: ${settings.phone} · Email: ${settings.email}`;
  doc.text(legal, 14, pageHeight - 10);
  doc.text(`Page 1 / 1`, 196, pageHeight - 10, { align: 'right' });
}

export function generateQuotationPDF(quote: Quotation, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Devis Commercial', quote.quote_number, quote.date);

  // Client Info Box
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('CLIENT / DESTINATAIRE', 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Nom: ${quote.customer_name || 'Client au comptoir'}`, 20, 49);
  doc.text(`Date de validité: ${formatDateFr(quote.expiry_date)}`, 120, 49);
  doc.text(`Statut du devis: ${quote.status.toUpperCase()}`, 120, 56);
  if (quote.notes) {
    doc.text(`Observations: ${quote.notes}`, 20, 56);
  }

  // Items table
  const tableData = quote.items.map((it, idx) => [
    idx + 1,
    `${it.product_name || 'Ciment'} (${it.product_code || ''})`,
    `${it.quantity} sacs`,
    formatFCFA(it.unit_price),
    it.discount ? formatFCFA(it.discount) : '-',
    formatFCFA(it.total_price),
  ]);

  autoTable(doc, {
    startY: 66,
    head: [['#', 'Désignation Produit', 'Quantité', 'Prix Unitaire', 'Remise', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Totals Box
  const totalsX = 120;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsX, finalY + 6, 76, 26, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Sous-total:', totalsX + 4, finalY + 12);
  doc.text(formatFCFA(quote.subtotal), 192, finalY + 12, { align: 'right' });

  doc.text('Remise globale:', totalsX + 4, finalY + 18);
  doc.text(formatFCFA(quote.discount), 192, finalY + 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.text('MONTANT TOTAL:', totalsX + 4, finalY + 26);
  doc.text(formatFCFA(quote.total_amount), 192, finalY + 26, { align: 'right' });

  // Signature areas
  const signY = finalY + 45;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Le Responsable Commercial', 25, signY);
  doc.text('(Signature & Cachet)', 25, signY + 5);

  doc.text('Bon pour Accord Client', 140, signY);
  doc.text('(Date & Signature)', 140, signY + 5);

  drawFooter(doc, settings);
  doc.save(`${quote.quote_number}.pdf`);
}

export function generateInvoicePDF(invoice: Invoice, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Facture de Vente', invoice.invoice_number, invoice.date);

  // Customer info & payment badge
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('FACTURÉ À', 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Client: ${invoice.customer_name || 'Client comptoir'}`, 20, 49);
  doc.text(`Réf. Vente: ${invoice.sale_number || invoice.sale_id}`, 20, 56);

  doc.text(`Date d'échéance: ${formatDateFr(invoice.due_date)}`, 120, 49);
  const statusTxt = invoice.payment_status === 'payee' ? 'PAYÉE EN TOTALITÉ' : (invoice.payment_status === 'partielle' ? 'PARTIELLEMENT PAYÉE' : 'IMPAYÉE (À RÉGLER)');
  doc.setFont('helvetica', 'bold');
  if (invoice.payment_status === 'payee') {
    doc.setTextColor(16, 120, 60);
  } else if (invoice.payment_status === 'partielle') {
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`Statut: ${statusTxt}`, 120, 56);

  // Items table
  const tableData = invoice.items.map((it, idx) => [
    idx + 1,
    `${it.product_name || 'Ciment'} (${it.product_code || ''})`,
    `${it.quantity} sacs`,
    formatFCFA(it.unit_price),
    it.discount ? formatFCFA(it.discount) : '-',
    formatFCFA(it.total_price),
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Désignation', 'Quantité', 'Prix Unitaire', 'Remise', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Totals Box
  const totalsX = 110;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsX, finalY + 6, 86, 36, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('Sous-total:', totalsX + 4, finalY + 12);
  doc.text(formatFCFA(invoice.subtotal), 192, finalY + 12, { align: 'right' });

  doc.text('Remise accordée:', totalsX + 4, finalY + 18);
  doc.text(formatFCFA(invoice.discount), 192, finalY + 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Total à payer:', totalsX + 4, finalY + 25);
  doc.text(formatFCFA(invoice.total_amount), 192, finalY + 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Montant déjà réglé:', totalsX + 4, finalY + 31);
  doc.text(formatFCFA(invoice.paid_amount), 192, finalY + 31, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.text('Solde restant dû:', totalsX + 4, finalY + 38);
  doc.text(formatFCFA(invoice.remaining_amount), 192, finalY + 38, { align: 'right' });

  // Bank & Mobile Money Instructions
  if (settings.bank_details || settings.mobile_money_details) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(`Règlement: ${settings.bank_details}`, 14, finalY + 14);
    doc.text(`${settings.mobile_money_details}`, 14, finalY + 20);
  }

  // Signatures
  const signY = finalY + 50;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Service Comptabilité & Caisse', 25, signY);
  doc.text('(Signature & Cachet)', 25, signY + 5);

  doc.text('Reçu Conforme par le Client', 135, signY);
  doc.text('(Signature)', 135, signY + 5);

  drawFooter(doc, settings);
  doc.save(`${invoice.invoice_number}.pdf`);
}

export function generateDeliverySlipPDF(delivery: Delivery, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Bon de Livraison', delivery.delivery_number, delivery.date);

  // Destination & Transporter info
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('DESTINATAIRE & CHANTIER', 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Client: ${delivery.customer_name || 'Client'}`, 20, 48);
  doc.text(`Adresse de déchargement: ${delivery.delivery_address}`, 20, 54);
  doc.text(`Réf. Commande / Vente: ${delivery.sale_number || delivery.sale_id}`, 20, 60);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('LOGISTIQUE / TRANSPORT', 115, 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(`Chauffeur: ${delivery.driver_name || 'Transporteur interne'}`, 115, 48);
  doc.text(`Véhicule: ${delivery.vehicle_info || 'Camion dépôt'}`, 115, 54);
  doc.text(`Statut: ${delivery.status.toUpperCase()}`, 115, 60);

  // Delivery Items table
  const tableData = delivery.items.map((it, idx) => [
    idx + 1,
    `${it.product_name || 'Ciment'} (${it.product_code || ''})`,
    `${it.quantity_ordered} sacs`,
    `${it.quantity_delivered} sacs`,
    `${it.quantity_remaining} sacs`,
    it.quantity_remaining === 0 ? 'LIVRAISON TOTALE' : 'SOLDE RESTANT',
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Produit', 'Qté Commandée', 'Qté Livrée Ce Jour', 'Qté Restante', 'Observation']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Verification & Signatures
  const signY = finalY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('Expédié par le Dépôt', 20, signY);
  doc.text('Transporteur / Chauffeur', 85, signY);
  doc.text('Réceptionné sur Chantier par le Client', 140, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('(Visa Magasinier)', 20, signY + 5);
  doc.text('(Signature prise en charge)', 85, signY + 5);
  doc.text('(Signature & Mention "Bon pour réception")', 140, signY + 5);

  drawFooter(doc, settings);
  doc.save(`${delivery.delivery_number}.pdf`);
}

export function generatePurchaseReceiptPDF(purchase: Purchase, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Bon de Réception', purchase.purchase_number, purchase.date);

  // Supplier info
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('FOURNISSEUR & RÉCEPTION', 20, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Fournisseur: ${purchase.supplier_name || 'Fournisseur usine'}`, 20, 49);
  doc.text(`Réf. Bon de Livraison Fournisseur: ${purchase.supplier_invoice_ref}`, 20, 55);

  doc.text(`Réceptionné par: ${purchase.created_by}`, 120, 49);
  doc.text(`Statut stock: ENTRÉE ENREGISTRÉE AU DÉPÔT`, 120, 55);

  // Items table
  const tableData = purchase.items.map((it, idx) => [
    idx + 1,
    `${it.product_name || 'Ciment'} (${it.product_code || ''})`,
    `${it.quantity} sacs`,
    formatFCFA(it.unit_price),
    formatFCFA(it.total_price),
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Produit Reçu', 'Quantité', "Prix d'Achat Unitaire (CMP)", 'Montant Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text(`Valeur Totale Entrée en Stock: ${formatFCFA(purchase.total_amount)}`, 192, finalY + 15, { align: 'right' });

  // Signatures
  const signY = finalY + 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Le Gestionnaire du Stock', 25, signY);
  doc.text('(Visa Contrôle Quantité)', 25, signY + 5);

  doc.text('Le Chauffeur / Livreur Usine', 135, signY);
  doc.text('(Signature de déchargement)', 135, signY + 5);

  drawFooter(doc, settings);
  doc.save(`${purchase.purchase_number}.pdf`);
}

export function generatePaymentReceiptPDF(payment: Payment, settings: CompanySettings) {
  // A5 format receipt
  const doc = new jsPDF({ orientation: 'portrait', format: 'a5' });
  const w = doc.internal.pageSize.width;

  // Header band
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, w, 24, 'F');
  doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.rect(0, 24, w, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(settings.company_name, 10, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`REÇU D'ENCAISSEMENT N° ${payment.payment_number}`, 10, 18);
  doc.text(`Date: ${formatDateFr(payment.date)}`, w - 10, 18, { align: 'right' });

  // Receipt content
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  let y = 35;

  doc.text(`Reçu de :`, 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${payment.customer_name || 'Client'}`, 35, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Pour le compte de :`, 10, y);
  doc.text(`Facture / Vente : ${payment.invoice_number || payment.sale_number || '-'}`, 45, y);

  y += 8;
  doc.text(`Mode de règlement :`, 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${payment.payment_method.toUpperCase()} ${payment.transaction_ref ? `(Réf: ${payment.transaction_ref})` : ''}`, 45, y);

  // Big amount box
  y += 12;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 210, 220);
  doc.roundedRect(10, y, w - 20, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.text(`MONTANT ENCAISSÉ : ${formatFCFA(payment.amount)}`, w / 2, y + 13, { align: 'center' });

  y += 30;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (payment.notes) {
    doc.text(`Motif / Notes: ${payment.notes}`, 10, y);
    y += 8;
  }
  doc.text(`Caissier(ère) : ${payment.created_by}`, 10, y);

  y += 18;
  doc.text('Signature & Cachet Caisse', w - 15, y, { align: 'right' });

  doc.save(`${payment.payment_number}.pdf`);
}

/**
 * Génère le Manuel d'Utilisation Officiel CIMENPRO en PDF
 */
export function exportUserGuidePDF(settings: CompanySettings) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;

  // Header band
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.rect(0, 32, 210, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.company_name.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('MANUEL D\'UTILISATION & GUIDE OPÉRATIONNEL DES PROCÉDURES DU DÉPÔT', 14, 23);
  doc.setFontSize(8);
  doc.text(`${settings.city}, ${settings.country} · Tél: ${settings.phone} · Email: ${settings.email}`, 14, 28);

  let y = 44;

  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. PRINCIPES GÉNÉRAUX & GESTION EN SACS DE CIMENT', 14, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textP1 = [
    '• Unité de gestion : Le sac unitaire (50 kg). 1 Tonne équivaut rigoureusement à 20 sacs.',
    '• Devise & Fiscalité : Tous les montants sont en FCFA (XAF), gestion simplifiée sans TVA.',
    '• Rôles & Accès : Chaque collaborateur accède uniquement aux fonctions correspondant à ses attributions.',
  ];
  textP1.forEach(line => {
    doc.text(line, 14, y);
    y += 5.5;
  });

  y += 4;
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. RÉCEPTION USINE & APPROVISIONNEMENT (MAGASINIER / GESTIONNAIRE STOCK)', 14, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textP2 = [
    '• Contrôle physique : Vérifier le nombre de sacs réels et l\'absence de déchirures ou d\'humidité avant de signer le BL usine.',
    '• Saisie CIMENPRO : Ouvrir Approvisionnements > Nouvelle Réception > Renseigner le fournisseur et la quantité exacte.',
    '• Mise à jour : Le stock disponible augmente instantanément et le Coût Moyen Pondéré (CMP) est recalculé.',
    '• Bon de Réception (BR) : Imprimer le document interne pour classement avec le bon du transporteur.',
  ];
  textP2.forEach(line => {
    doc.text(line, 14, y);
    y += 5.5;
  });

  y += 4;
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. VENTES COMPTOIR & LIVRAISONS SUR CHANTIERS (COMMERCIAL)', 14, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textP3 = [
    '• Vente immédiate (Emporté) : Les sacs sont déduits du stock disponible en temps réel dès la validation.',
    '• Vente avec livraison sur chantier : Les sacs sont placés en Stock Réservé pour bloquer la quantité vendue.',
    '• Bons de Livraison (BL) : Émis à chaque rotation de camion. La déduction physique intervient au départ du camion.',
    '• Devis : Un devis ne modifie pas le stock physique tant qu\'il n\'a pas été validé et converti.',
  ];
  textP3.forEach(line => {
    doc.text(line, 14, y);
    y += 5.5;
  });

  y += 4;
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. CAISSE, ENCAISSEMENTS & DÉPENSES (CAISSIÈRE)', 14, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textP4 = [
    '• Modes acceptés : Espèces, Mobile Money (MTN MoMo / Airtel Money), Virement bancaire BGFI Congo.',
    '• Sécurité Mobile Money : Exiger impérativement la confirmation SMS officielle sur le téléphone du dépôt.',
    '• Reçu de caisse : Toujours remettre le reçu officiel imprimé au client.',
    '• Dépenses : Enregistrer chaque décaissement (manutentionnaires/chargeurs, carburant, loyer) avec justificatif.',
  ];
  textP4.forEach(line => {
    doc.text(line, 14, y);
    y += 5.5;
  });

  y += 4;
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('5. INVENTAIRE PHYSIQUE & GESTION DES REBUTS', 14, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textP5 = [
    '• Comptage régulier : Vérifier physiquement chaque travée de ciment (CIMAF, DANGOTE, SOCIMAT, etc.).',
    '• Régularisation : Déclarer les écarts dans Inventaire > Régularisation (Avarie humidité, Rebut percé, Entrée de correction).',
    '• Alertes seuils : Surveiller les alertes de stock minimum (moins de 150 sacs) pour déclencher les commandes usine.',
  ];
  textP5.forEach(line => {
    doc.text(line, 14, y);
    y += 5.5;
  });

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 16, 196, pageHeight - 16);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Document officiel d\'exploitation · ${settings.company_name} · Brazzaville`, 14, pageHeight - 10);
  doc.text('Page 1 / 1', 196, pageHeight - 10, { align: 'right' });

  doc.save('Manuel_Utilisation_CIMENPRO.pdf');
}

