import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'depot_ciment.db');
export const db = new Database(DB_FILE);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      nif TEXT,
      currency TEXT NOT NULL DEFAULT 'FCFA',
      prefix_quote TEXT NOT NULL DEFAULT 'DEV-',
      prefix_invoice TEXT NOT NULL DEFAULT 'FAC-',
      prefix_receipt TEXT NOT NULL DEFAULT 'REC-',
      prefix_delivery TEXT NOT NULL DEFAULT 'BL-',
      prefix_purchase TEXT NOT NULL DEFAULT 'BR-',
      low_stock_threshold INTEGER NOT NULL DEFAULT 100,
      timezone TEXT NOT NULL DEFAULT 'Africa/Brazzaville',
      footer_note TEXT,
      bank_details TEXT,
      mobile_money_details TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- admin, gestionnaire_stock, commercial, caissier, responsable
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      customer_type TEXT NOT NULL, -- grossiste, demi_grossiste, détaillant, entrepreneur_btp, particulier
      credit_limit REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL, -- Cimaf, Dangote, CBC / Diamond Cement, Socimat
      type_ref TEXT NOT NULL, -- CPJ 35, CPJ 42.5, CPA 55
      packaging TEXT NOT NULL DEFAULT '50kg',
      unit TEXT NOT NULL DEFAULT 'sac',
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      initial_stock INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 100,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      purchase_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      supplier_invoice_ref TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'validee', -- validee, en_attente, annulee
      created_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      reference_type TEXT NOT NULL, -- purchase, sale, delivery, inventory
      reference_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      delivery_type TEXT NOT NULL DEFAULT 'emporte_immediat', -- emporte_immediat, a_livrer
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      payment_status TEXT NOT NULL, -- payee, partielle, impayee
      payment_method TEXT NOT NULL, -- especes, mobile_money, virement, autre
      delivery_status TEXT NOT NULL DEFAULT 'livree', -- livree, en_attente, partielle, annulee
      created_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL,
      delivered_quantity INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      delivery_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      delivery_address TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      vehicle_info TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'livree', -- livree, en_attente, partielle, annulee
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity_ordered INTEGER NOT NULL,
      quantity_delivered INTEGER NOT NULL,
      quantity_remaining INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quote_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'brouillon', -- brouillon, envoye, accepte, refuse, expire
      converted_to_sale_id TEXT,
      converted_to_invoice_id TEXT,
      created_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      payment_status TEXT NOT NULL, -- payee, partielle, impayee
      status TEXT NOT NULL DEFAULT 'validee', -- validee, annulee
      cancellation_reason TEXT,
      created_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_ref TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      receipt_ref TEXT,
      approved_by TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL, -- ENCAISSEMENT_VENTE, PAIEMENT_FACTURE, DEPENSE, AJUSTEMENT_CAISSE
      amount REAL NOT NULL, -- positive for cash in, negative for cash out
      payment_method TEXT NOT NULL,
      reference_id TEXT,
      reference_type TEXT,
      reference_number TEXT,
      created_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id TEXT PRIMARY KEY,
      adjustment_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      theoretical_stock INTEGER NOT NULL,
      physical_stock INTEGER NOT NULL,
      discrepancy INTEGER NOT NULL,
      reason TEXT NOT NULL,
      validated_by TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Ensure default company settings
  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM company_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO company_settings (
        id, company_name, tagline, logo_url, address, city, country, phone, email, nif, currency,
        prefix_quote, prefix_invoice, prefix_receipt, prefix_delivery, prefix_purchase,
        low_stock_threshold, timezone, footer_note, bank_details, mobile_money_details
      ) VALUES (
        1,
        'CIMENPRO',
        'Vente en gros et détail de ciment certifié',
        '',
        'Avenue de l''Indépendance, Rond-point Moungali',
        'Brazzaville',
        'République du Congo',
        '+242 06 654 32 10 / +242 05 512 88 99',
        'contact@cimenpro.cg',
        'M2023110900452',
        'FCFA',
        'DEV-',
        'FAC-',
        'REC-',
        'BL-',
        'BR-',
        150,
        'Africa/Brazzaville',
        'Les sacs de ciment livrés doivent être stockés à l''abri de l''humidité. Pas de reprise après 48h.',
        'Banque BGFI Congo - N° Compte: 30004 00120 12345678901 45',
        'MTN MoMo: +242 06 654 32 10 / Airtel Money: +242 05 512 88 99'
      )
    `).run();
  } else {
    db.prepare(`
      UPDATE company_settings 
      SET company_name = 'CIMENPRO', email = 'contact@cimenpro.cg'
      WHERE company_name LIKE '%DÉPÔT CENTRAL%' OR company_name = '' OR company_name IS NULL
    `).run();
  }

  // Ensure initial users
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    seedInitialUsers();
    seedDemonstrationData();
  }
}

function seedInitialUsers() {
  const now = new Date().toISOString();
  const users = [
    { id: 'usr-admin', email: 'admin@depotciment.cg', name: 'Alain Mabiala (Directeur)', role: 'admin', phone: '+242 06 600 11 22' },
    { id: 'usr-stock', email: 'stock@depotciment.cg', name: 'Gérard Okemba (Gestionnaire Stock)', role: 'gestionnaire_stock', phone: '+242 06 600 33 44' },
    { id: 'usr-com', email: 'commercial@depotciment.cg', name: 'Clarisse Moukala (Commerciale)', role: 'commercial', phone: '+242 06 600 55 66' },
    { id: 'usr-caisse', email: 'caisse@depotciment.cg', name: 'Arlette Ngoma (Caissière)', role: 'caissier', phone: '+242 06 600 77 88' },
    { id: 'usr-resp', email: 'responsable@depotciment.cg', name: 'Patrice Loubaki (Superviseur)', role: 'responsable', phone: '+242 06 600 99 00' },
  ];

  const stmt = db.prepare('INSERT INTO users (id, email, name, role, phone, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)');
  for (const u of users) {
    stmt.run(u.id, u.email, u.name, u.role, u.phone, now);
  }
}

export function seedDemonstrationData() {
  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const d0 = formatDate(now);
  const d1 = formatDate(new Date(now.getTime() - 1 * 86400000));
  const d2 = formatDate(new Date(now.getTime() - 2 * 86400000));
  const d3 = formatDate(new Date(now.getTime() - 3 * 86400000));
  const d5 = formatDate(new Date(now.getTime() - 5 * 86400000));

  // Suppliers
  const suppliers = [
    { id: 'sup-cimaf', name: "CIMAF Ciments de l'Afrique (Usine Brazza)", phone: '+242 06 910 20 30', address: 'Zone Industrielle de Maloukou', contact_person: 'M. Touré (Directeur Ventes)', email: 'commercial.congo@cimaf.com' },
    { id: 'sup-dangote', name: 'Dangote Cement Congo Distribution', phone: '+242 05 820 40 50', address: 'Dépôt Régional Pointe-Noire / Brazzaville', contact_person: 'Mme Adeleke', email: 'distribution@dangotecement.cg' },
    { id: 'sup-diamond', name: 'Diamond Cement / CBC Congo', phone: '+242 06 730 60 70', address: 'Usine de Loutété, Bouenza', contact_person: 'Ing. Mampouya', email: 'ventes@cbc-cement.cg' },
  ];

  const insertSup = db.prepare('INSERT OR REPLACE INTO suppliers (id, name, phone, address, contact_person, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const s of suppliers) {
    insertSup.run(s.id, s.name, s.phone, s.address, s.contact_person, s.email, d5);
  }

  // Customers
  const customers = [
    { id: 'cust-1', name: 'BTP CONGO SARL (Grands Travaux)', phone: '+242 06 444 11 22', address: 'Boulevard Denis Sassou Nguesso, Mpila', customer_type: 'entrepreneur_btp', credit_limit: 15000000 },
    { id: 'cust-2', name: 'Quincaillerie Moderne Talangaï', phone: '+242 05 555 33 44', address: 'Marché Commissionnaire, Talangaï', customer_type: 'grossiste', credit_limit: 8000000 },
    { id: 'cust-3', name: 'ETS Makélékélé Bâtiment & Matériaux', phone: '+242 06 666 55 66', address: 'Avenue de la Paix, Makélékélé', customer_type: 'demi_grossiste', credit_limit: 5000000 },
    { id: 'cust-4', name: 'Entreprise Nouvelle Construction (ENC)', phone: '+242 05 777 77 88', address: 'Route Nationale 1, Kintélé', customer_type: 'entrepreneur_btp', credit_limit: 10000000 },
    { id: 'cust-5', name: 'M. Jean-Pierre Samba (Chantier Privé)', phone: '+242 06 888 99 00', address: 'Quartier Ouenze, Rue Mbaka', customer_type: 'particulier', credit_limit: 0 },
    { id: 'cust-6', name: 'Dépôt Quincaillerie Bacongo', phone: '+242 05 999 12 34', address: 'Marché Total, Bacongo', customer_type: 'détaillant', credit_limit: 3000000 },
  ];

  const insertCust = db.prepare('INSERT OR REPLACE INTO customers (id, name, phone, address, customer_type, credit_limit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const c of customers) {
    insertCust.run(c.id, c.name, c.phone, c.address, c.customer_type, c.credit_limit, d5);
  }

  // Products
  const products = [
    {
      id: 'prod-cimaf-35',
      code: 'CIM-CPJ35',
      name: 'Ciment Gris CIMAF CPJ 35',
      brand: 'CIMAF',
      type_ref: 'CPJ 35 (Usage général)',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 4600,
      selling_price: 5200,
      initial_stock: 1200,
      current_stock: 1450,
      reserved_stock: 200,
      min_stock: 250,
      supplier_id: 'sup-cimaf',
      description: 'Ciment Portland composé pour maçonnerie courante, béton armé standard et dallages.',
    },
    {
      id: 'prod-cimaf-42',
      code: 'CIM-CPJ42',
      name: 'Ciment Haute Résistance CIMAF CPJ 42.5',
      brand: 'CIMAF',
      type_ref: 'CPJ 42.5 (Haute performance)',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 4950,
      selling_price: 5650,
      initial_stock: 800,
      current_stock: 920,
      reserved_stock: 150,
      min_stock: 200,
      supplier_id: 'sup-cimaf',
      description: "Idéal pour ouvrages d'art, piliers, poutres, fondations lourdes et décoffrage rapide.",
    },
    {
      id: 'prod-dangote-32',
      code: 'DAN-FALCON',
      name: 'Ciment DANGOTE Falcon 32.5R',
      brand: 'DANGOTE',
      type_ref: 'CPJ 32.5 R',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 4500,
      selling_price: 5100,
      initial_stock: 900,
      current_stock: 820,
      reserved_stock: 0,
      min_stock: 200,
      supplier_id: 'sup-dangote',
      description: 'Ciment de grande réputation pour crépis, briques pleines/creuses et mortiers.',
    },
    {
      id: 'prod-dangote-42',
      code: 'DAN-3X',
      name: 'Ciment DANGOTE 3X 42.5R Super Fort',
      brand: 'DANGOTE',
      type_ref: 'CPJ 42.5 R',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 4850,
      selling_price: 5500,
      initial_stock: 1000,
      current_stock: 650,
      reserved_stock: 100,
      min_stock: 200,
      supplier_id: 'sup-dangote',
      description: 'Formulation 3X extra-résistante pour dalles de grands immeubles et structures porteuses.',
    },
    {
      id: 'prod-cbc-35',
      code: 'CBC-CPJ35',
      name: 'Ciment DIAMOND CEMENT / CBC CPJ 35',
      brand: 'DIAMOND CEMENT',
      type_ref: 'CPJ 35',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 4400,
      selling_price: 5000,
      initial_stock: 600,
      current_stock: 310,
      reserved_stock: 50,
      min_stock: 150,
      supplier_id: 'sup-diamond',
      description: 'Produit localement à Loutété. Très apprécié des briquetiers et artisans locaux.',
    },
    {
      id: 'prod-socimat-blanc',
      code: 'SOC-BLANC',
      name: 'Ciment Blanc SOCIMAT Architectural 52.5',
      brand: 'SOCIMAT',
      type_ref: 'CPA 52.5 N Blanc',
      packaging: '50kg',
      unit: 'sac',
      purchase_price: 11000,
      selling_price: 13500,
      initial_stock: 80,
      current_stock: 45,
      reserved_stock: 0,
      min_stock: 50, // Flag low stock alert
      supplier_id: 'sup-cimaf',
      description: 'Ciment blanc ultra-pur pour finitions décoratives, façades, piscines et terrazzo.',
    },
  ];

  const insertProd = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, code, name, brand, type_ref, packaging, unit, purchase_price, selling_price,
      initial_stock, current_stock, reserved_stock, min_stock, supplier_id, description,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const p of products) {
    insertProd.run(
      p.id, p.code, p.name, p.brand, p.type_ref, p.packaging, p.unit,
      p.purchase_price, p.selling_price, p.initial_stock, p.current_stock,
      p.reserved_stock, p.min_stock, p.supplier_id, p.description, d5, d0
    );
  }

  // Purchases (Approvisionnements)
  const p1Id = 'pur-001';
  db.prepare(`
    INSERT OR REPLACE INTO purchases (id, purchase_number, date, supplier_id, supplier_invoice_ref, total_amount, status, created_by, notes, created_at)
    VALUES (?, 'BR-2026-001', ?, 'sup-cimaf', 'BL-CIMAF-9842', 4600000, 'validee', 'Gérard Okemba', 'Livraison par semi-remorque 30T usine Brazzaville', ?)
  `).run(p1Id, d3, d3);

  db.prepare(`
    INSERT OR REPLACE INTO purchase_items (id, purchase_id, product_id, quantity, unit_price, total_price)
    VALUES ('pitem-1', ?, 'prod-cimaf-35', 600, 4600, 2760000),
           ('pitem-2', ?, 'prod-cimaf-42', 371, 4950, 1840000)
  `).run(p1Id, p1Id);

  // Stock Movement for Purchase 1
  db.prepare(`
    INSERT OR REPLACE INTO stock_movements (id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, created_by, reason, created_at)
    VALUES ('mov-pur-1', ?, 'prod-cimaf-35', 'ENTREE_ACHAT', 600, 850, 1450, 4600, 'purchase', 'BR-2026-001', 'Gérard Okemba', 'Réception semi-remorque BR-2026-001', ?),
           ('mov-pur-2', ?, 'prod-cimaf-42', 'ENTREE_ACHAT', 371, 549, 920, 4950, 'purchase', 'BR-2026-001', 'Gérard Okemba', 'Réception semi-remorque BR-2026-001', ?)
  `).run(d3, d3, d3, d3);

  // Sales (Ventes)
  // Sale 1: Vente directe emportée payée en espèces
  const s1Id = 'sal-001';
  db.prepare(`
    INSERT OR REPLACE INTO sales (id, sale_number, date, customer_id, delivery_type, subtotal, discount, total_amount, paid_amount, remaining_amount, payment_status, payment_method, delivery_status, created_by, notes, created_at)
    VALUES (?, 'VNT-2026-001', ?, 'cust-5', 'emporte_immediat', 520000, 0, 520000, 520000, 0, 'payee', 'especes', 'livree', 'Clarisse Moukala', 'Enlèvement immédiat camion benne client', ?)
  `).run(s1Id, d2, d2);

  db.prepare(`
    INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total_price, delivered_quantity)
    VALUES ('sitem-1', ?, 'prod-cimaf-35', 100, 5200, 0, 520000, 100)
  `).run(s1Id);

  db.prepare(`
    INSERT OR REPLACE INTO invoices (id, invoice_number, date, due_date, sale_id, customer_id, subtotal, discount, total_amount, paid_amount, remaining_amount, payment_status, status, created_by, notes, created_at)
    VALUES ('fac-001', 'FAC-2026-001', ?, ?, ?, 'cust-5', 520000, 0, 520000, 520000, 0, 'payee', 'validee', 'Clarisse Moukala', 'Payé comptant au guichet', ?)
  `).run(d2, d2, s1Id, d2);

  db.prepare(`
    INSERT OR REPLACE INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, discount, total_price)
    VALUES ('fitem-1', 'fac-001', 'prod-cimaf-35', 100, 5200, 0, 520000)
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO payments (id, payment_number, date, customer_id, sale_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by, created_at)
    VALUES ('pay-001', 'REC-2026-001', ?, 'cust-5', ?, 'fac-001', 520000, 'especes', 'CAISSE-ESP-01', 'Règlement total au comptoir', 'Arlette Ngoma', ?)
  `).run(d2, s1Id, d2);

  db.prepare(`
    INSERT OR REPLACE INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
    VALUES ('csh-001', ?, 'ENCAISSEMENT_VENTE', 520000, 'especes', 'pay-001', 'payment', 'REC-2026-001', 'Arlette Ngoma', 'Vente VNT-2026-001', ?)
  `).run(d2, d2);

  // Sale 2: Vente BTP Congo (à livrer, paiement partiel Mobile Money + Virement, restant en créance)
  const s2Id = 'sal-002';
  db.prepare(`
    INSERT OR REPLACE INTO sales (id, sale_number, date, customer_id, delivery_type, subtotal, discount, total_amount, paid_amount, remaining_amount, payment_status, payment_method, delivery_status, created_by, notes, created_at)
    VALUES (?, 'VNT-2026-002', ?, 'cust-1', 'a_livrer', 2825000, 25000, 2800000, 1500000, 1300000, 'partielle', 'virement', 'partielle', 'Clarisse Moukala', 'Chantier R+4 Mpila - Livraison échelonnée', ?)
  `).run(s2Id, d1, d1);

  db.prepare(`
    INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total_price, delivered_quantity)
    VALUES ('sitem-2', ?, 'prod-cimaf-42', 300, 5650, 25000, 1670000, 150),
           ('sitem-3', ?, 'prod-dangote-42', 200, 5500, 0, 1100000, 100)
  `).run(s2Id, s2Id);

  db.prepare(`
    INSERT OR REPLACE INTO invoices (id, invoice_number, date, due_date, sale_id, customer_id, subtotal, discount, total_amount, paid_amount, remaining_amount, payment_status, status, created_by, notes, created_at)
    VALUES ('fac-002', 'FAC-2026-002', ?, ?, ?, 'cust-1', 2825000, 25000, 2800000, 1500000, 1300000, 'partielle', 'validee', 'Clarisse Moukala', 'Acompte versé par virement BGFI, solde fin de mois', ?)
  `).run(d1, d0, s2Id, d1);

  db.prepare(`
    INSERT OR REPLACE INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, discount, total_price)
    VALUES ('fitem-2', 'fac-002', 'prod-cimaf-42', 300, 5650, 25000, 1670000),
           ('fitem-3', 'fac-002', 'prod-dangote-42', 200, 5500, 0, 1100000)
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO payments (id, payment_number, date, customer_id, sale_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by, created_at)
    VALUES ('pay-002', 'REC-2026-002', ?, 'cust-1', ?, 'fac-002', 1500000, 'virement', 'VIR-BGFI-88392', 'Acompte 53% commande Mpila', 'Arlette Ngoma', ?)
  `).run(d1, s2Id, d1);

  db.prepare(`
    INSERT OR REPLACE INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
    VALUES ('csh-002', ?, 'PAIEMENT_FACTURE', 1500000, 'virement', 'pay-002', 'payment', 'REC-2026-002', 'Arlette Ngoma', 'Acompte FAC-2026-002', ?)
  `).run(d1, d1);

  // Delivery 1 for Sale 2 (Partielle: 150 sacs Cimaf 42.5 et 100 sacs Dangote 42.5 livrés)
  db.prepare(`
    INSERT OR REPLACE INTO deliveries (id, delivery_number, date, sale_id, customer_id, delivery_address, driver_name, vehicle_info, status, notes, created_by, created_at)
    VALUES ('del-001', 'BL-2026-001', ?, ?, 'cust-1', 'Chantier R+4, Boulevard Sassou Nguesso Mpila', 'Rodrigue Matondo', 'Camion Mercedes 15T - Plaque 432-EM-5', 'partielle', '1ère rotation effectuée avec succès', 'Gérard Okemba', ?)
  `).run(d1, s2Id, d1);

  db.prepare(`
    INSERT OR REPLACE INTO delivery_items (id, delivery_id, product_id, quantity_ordered, quantity_delivered, quantity_remaining)
    VALUES ('ditem-1', 'del-001', 'prod-cimaf-42', 300, 150, 150),
           ('ditem-2', 'del-001', 'prod-dangote-42', 200, 100, 100)
  `).run();

  // Quotations (Devis)
  const q1Id = 'quo-001';
  db.prepare(`
    INSERT OR REPLACE INTO quotations (id, quote_number, date, expiry_date, customer_id, subtotal, discount, total_amount, status, created_by, notes, created_at)
    VALUES (?, 'DEV-2026-001', ?, ?, 'cust-4', 2750000, 50000, 2700000, 'envoye', 'Clarisse Moukala', 'Devis pour coulage radier Kintélé', ?)
  `).run(q1Id, d1, d0, d1);

  db.prepare(`
    INSERT OR REPLACE INTO quotation_items (id, quotation_id, product_id, quantity, unit_price, discount, total_price)
    VALUES ('qitem-1', ?, 'prod-dangote-42', 500, 5500, 50000, 2700000)
  `).run(q1Id);

  // Expenses (Dépenses)
  const expenses = [
    { id: 'exp-001', expense_number: 'DEP-2026-001', date: d2, category: 'carburant', description: 'Gasoil camion Mercedes livraison Mpila', amount: 45000, payment_method: 'especes', receipt_ref: 'TICK-TOTAL-452', approved_by: 'Alain Mabiala' },
    { id: 'exp-002', expense_number: 'DEP-2026-002', date: d1, category: 'manutention_dechargement', description: 'Déchargement semi-remorque 600 sacs Cimaf (Équipe dockers)', amount: 60000, payment_method: 'especes', receipt_ref: 'BON-MANUT-12', approved_by: 'Gérard Okemba' },
    { id: 'exp-003', expense_number: 'DEP-2026-003', date: d0, category: 'divers', description: 'Bâches de protection imperméables dépôt', amount: 25000, payment_method: 'mobile_money', receipt_ref: 'MOMO-78921', approved_by: 'Alain Mabiala' },
  ];

  const insertExp = db.prepare(`
    INSERT OR REPLACE INTO expenses (id, expense_number, date, category, description, amount, payment_method, receipt_ref, approved_by, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Arlette Ngoma', ?)
  `);

  const insertCashExp = db.prepare(`
    INSERT OR REPLACE INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
    VALUES (?, ?, 'DEPENSE', ?, ?, ?, 'expense', ?, 'Arlette Ngoma', ?, ?)
  `);

  for (const e of expenses) {
    insertExp.run(e.id, e.expense_number, e.date, e.category, e.description, e.amount, e.payment_method, e.receipt_ref, e.approved_by, e.date);
    insertCashExp.run('csh-' + e.id, e.date, -e.amount, e.payment_method, e.id, e.expense_number, e.description, e.date);
  }

  // Audit Log
  db.prepare(`
    INSERT OR REPLACE INTO audit_logs (id, date, user_id, user_name, action, entity, entity_id, details, created_at)
    VALUES ('aud-init', ?, 'usr-admin', 'Alain Mabiala', 'INITIALISATION', 'SYSTÈME', '1', 'Initialisation du dépôt et chargement des données de base', ?)
  `).run(d5, d5);
}

export function purgeAllData() {
  db.transaction(() => {
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM cash_transactions').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM quotation_items').run();
    db.prepare('DELETE FROM quotations').run();
    db.prepare('DELETE FROM delivery_items').run();
    db.prepare('DELETE FROM deliveries').run();
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM stock_movements').run();
    db.prepare('DELETE FROM purchase_items').run();
    db.prepare('DELETE FROM purchases').run();
    db.prepare('DELETE FROM inventory_adjustments').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM customers').run();
    db.prepare('DELETE FROM suppliers').run();
  })();
}
