import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { db, initDatabase, seedDemonstrationData, purgeAllData } from './src/server/db.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize database schema and initial records
initDatabase();

// Helper to log audit actions
function logAudit(userId: string, userName: string, action: string, entity: string, entityId: string, details?: any) {
  try {
    const id = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const date = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, date, user_id, user_name, action, entity, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, userId, userName, action, entity, entityId, details ? JSON.stringify(details) : null, date);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// ----------------------------------------------------
// 1. COMPANY SETTINGS
// ----------------------------------------------------
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const {
      company_name, tagline, logo_url, address, city, country, phone, email,
      nif, currency, prefix_quote, prefix_invoice, prefix_receipt, prefix_delivery,
      prefix_purchase, low_stock_threshold, timezone, footer_note, bank_details, mobile_money_details
    } = req.body;

    db.prepare(`
      UPDATE company_settings SET
        company_name = ?, tagline = ?, logo_url = ?, address = ?, city = ?, country = ?,
        phone = ?, email = ?, nif = ?, currency = ?, prefix_quote = ?, prefix_invoice = ?,
        prefix_receipt = ?, prefix_delivery = ?, prefix_purchase = ?, low_stock_threshold = ?,
        timezone = ?, footer_note = ?, bank_details = ?, mobile_money_details = ?
      WHERE id = 1
    `).run(
      company_name, tagline || '', logo_url || '', address, city, country, phone, email,
      nif || '', currency || 'FCFA', prefix_quote || 'DEV-', prefix_invoice || 'FAC-',
      prefix_receipt || 'REC-', prefix_delivery || 'BL-', prefix_purchase || 'BR-',
      low_stock_threshold || 100, timezone || 'Africa/Brazzaville', footer_note || '',
      bank_details || '', mobile_money_details || ''
    );

    const updated = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. USERS & ROLES
// ----------------------------------------------------
app.get('/api/users', (req: Request, res: Response) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY name ASC').all();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const { email, name, role, phone } = req.body;
    const id = 'usr-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, name, role, phone, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, email, name, role, phone || null, now);
    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
    if (user.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Impossible de supprimer le seul administrateur restant du système' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logAudit('admin', 'Administrateur', 'SUPPRESSION_UTILISATEUR', 'users', id, { name: user.name, email: user.email });
    res.json({ success: true, message: `Utilisateur ${user.name} supprimé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. PRODUCTS & STOCK
// ----------------------------------------------------
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const products = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.name ASC
    `).all();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req: Request, res: Response) => {
  try {
    const {
      code, name, brand, type_ref, packaging, unit, purchase_price,
      selling_price, initial_stock, min_stock, supplier_id, description
    } = req.body;

    const id = 'prod-' + Date.now();
    const now = new Date().toISOString();
    const initStock = Number(initial_stock) || 0;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO products (
          id, code, name, brand, type_ref, packaging, unit, purchase_price,
          selling_price, initial_stock, current_stock, reserved_stock, min_stock,
          supplier_id, description, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?)
      `).run(
        id, code, name, brand, type_ref, packaging || '50kg', unit || 'sac',
        purchase_price, selling_price, initStock, initStock, min_stock || 100,
        supplier_id || null, description || '', now, now
      );

      if (initStock > 0) {
        db.prepare(`
          INSERT INTO stock_movements (
            id, date, product_id, movement_type, quantity, previous_stock,
            new_stock, unit_price, reference_type, reference_id, created_by, reason, created_at
          ) VALUES (?, ?, ?, 'ENTREE_ACHAT', ?, 0, ?, ?, 'inventory', 'INIT', 'Système', 'Stock d''ouverture initial', ?)
        `).run('mov-' + Date.now(), now.split('T')[0], id, initStock, initStock, purchase_price, now);
      }
    })();

    const created = db.prepare('SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code, name, brand, type_ref, packaging, unit, purchase_price,
      selling_price, min_stock, supplier_id, description, is_active
    } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products SET
        code = ?, name = ?, brand = ?, type_ref = ?, packaging = ?, unit = ?,
        purchase_price = ?, selling_price = ?, min_stock = ?, supplier_id = ?,
        description = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      code, name, brand, type_ref, packaging, unit, purchase_price,
      selling_price, min_stock, supplier_id || null, description,
      is_active !== undefined ? (is_active ? 1 : 0) : 1, now, id
    );

    const updated = db.prepare('SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id/movements', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movements = db.prepare(`
      SELECT m.*, p.name as product_name, p.code as product_code
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      WHERE m.product_id = ?
      ORDER BY m.created_at DESC
    `).all(id);
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock/movements', (req: Request, res: Response) => {
  try {
    const movements = db.prepare(`
      SELECT m.*, p.name as product_name, p.code as product_code, p.brand as product_brand
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      ORDER BY m.created_at DESC
      LIMIT 200
    `).all();
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!prod) return res.status(404).json({ error: 'Produit non trouvé' });

    db.transaction(() => {
      db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM purchase_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM sale_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM quotation_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM delivery_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM inventory_adjustments WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_PRODUIT', 'products', id, { name: prod.name, code: prod.code });
    })();

    res.json({ success: true, message: `Produit ${prod.name} supprimé avec succès` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stock/movements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mov = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id) as any;
    if (!mov) return res.status(404).json({ error: 'Mouvement de stock non trouvé' });

    db.prepare('DELETE FROM stock_movements WHERE id = ?').run(id);
    logAudit('admin', 'Administrateur', 'SUPPRESSION_MOUVEMENT_STOCK', 'stock_movements', id, { type: mov.movement_type });
    res.json({ success: true, message: 'Mouvement de stock supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. SUPPLIERS & CUSTOMERS
// ----------------------------------------------------
app.get('/api/suppliers', (req: Request, res: Response) => {
  try {
    const suppliers = db.prepare(`
      SELECT s.*,
        COALESCE((SELECT SUM(total_amount) FROM purchases WHERE supplier_id = s.id AND status = 'validee'), 0) as total_purchases
      FROM suppliers s
      ORDER BY s.name ASC
    `).all();
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  try {
    const { name, phone, address, contact_person, email, notes } = req.body;
    const id = 'sup-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, address, contact_person, email, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, address, contact_person || '', email || '', notes || '', now);
    const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers', (req: Request, res: Response) => {
  try {
    const customers = db.prepare(`
      SELECT c.*,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE customer_id = c.id), 0) as total_invoiced,
        COALESCE((SELECT SUM(paid_amount) FROM sales WHERE customer_id = c.id), 0) as total_paid,
        COALESCE((SELECT SUM(remaining_amount) FROM sales WHERE customer_id = c.id), 0) as balance_due
      FROM customers c
      ORDER BY c.name ASC
    `).all();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req: Request, res: Response) => {
  try {
    const { name, phone, address, customer_type, credit_limit } = req.body;
    const id = 'cust-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO customers (id, name, phone, address, customer_type, credit_limit, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, address, customer_type || 'particulier', credit_limit || 0, now);
    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sup = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
    if (!sup) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    logAudit('admin', 'Administrateur', 'SUPPRESSION_FOURNISSEUR', 'suppliers', id, { name: sup.name });
    res.json({ success: true, message: `Fournisseur ${sup.name} supprimé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!cust) return res.status(404).json({ error: 'Client non trouvé' });
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    logAudit('admin', 'Administrateur', 'SUPPRESSION_CLIENT', 'customers', id, { name: cust.name });
    res.json({ success: true, message: `Client ${cust.name} supprimé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PURCHASES (APPROVISIONNEMENTS)
// ----------------------------------------------------
app.get('/api/purchases', (req: Request, res: Response) => {
  try {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.date DESC, p.created_at DESC
    `).all();

    for (const pur of purchases as any[]) {
      pur.items = db.prepare(`
        SELECT pi.*, pr.name as product_name, pr.code as product_code
        FROM purchase_items pi
        JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `).all(pur.id);
    }

    res.json(purchases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', (req: Request, res: Response) => {
  try {
    const { date, supplier_id, supplier_invoice_ref, items, notes, created_by } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'La réception doit contenir au moins un produit.' });
    }

    const id = 'pur-' + Date.now();
    const now = new Date().toISOString();
    const count = (db.prepare('SELECT COUNT(*) as c FROM purchases').get() as { c: number }).c + 1;
    const purchase_number = `BR-2026-${String(count).padStart(3, '0')}`;

    let total_amount = 0;
    for (const item of items) {
      total_amount += Number(item.quantity) * Number(item.unit_price);
    }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO purchases (id, purchase_number, date, supplier_id, supplier_invoice_ref, total_amount, status, created_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'validee', ?, ?, ?)
      `).run(id, purchase_number, date, supplier_id, supplier_invoice_ref, total_amount, created_by || 'Gestionnaire Stock', notes || '', now);

      const insertItem = db.prepare(`
        INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const itemId = 'pitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const qty = Number(item.quantity);
        const price = Number(item.unit_price);
        const itemTotal = qty * price;
        insertItem.run(itemId, id, item.product_id, qty, price, itemTotal);

        // Update product stock and purchase price
        const currentProd = db.prepare('SELECT current_stock, purchase_price FROM products WHERE id = ?').get(item.product_id) as { current_stock: number; purchase_price: number };
        const prevStock = currentProd.current_stock;
        const newStock = prevStock + qty;

        // Weighted average cost (CMP)
        const oldVal = prevStock * currentProd.purchase_price;
        const newVal = qty * price;
        const cmpPrice = newStock > 0 ? Math.round((oldVal + newVal) / newStock) : price;

        db.prepare('UPDATE products SET current_stock = ?, purchase_price = ?, updated_at = ? WHERE id = ?')
          .run(newStock, cmpPrice, now, item.product_id);

        // Record stock movement
        const movId = 'mov-in-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO stock_movements (
            id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price,
            reference_type, reference_id, created_by, reason, created_at
          ) VALUES (?, ?, ?, 'ENTREE_ACHAT', ?, ?, ?, ?, 'purchase', ?, ?, ?, ?)
        `).run(movId, date, item.product_id, qty, prevStock, newStock, price, purchase_number, created_by || 'Gestionnaire Stock', `Réception fournisseur ${supplier_invoice_ref}`, now);
      }
    })();

    logAudit(created_by || 'admin', created_by || 'Gestionnaire', 'APPROVISIONNEMENT', 'purchases', id, { purchase_number, total_amount });
    res.status(201).json({ id, purchase_number, total_amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/purchases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pur = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any;
    if (!pur) return res.status(404).json({ error: 'Réception non trouvée' });

    db.transaction(() => {
      const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id) as any[];
      for (const item of items) {
        db.prepare(`
          UPDATE products 
          SET current_stock = MAX(0, current_stock - ?), updated_at = ?
          WHERE id = ?
        `).run(item.quantity, new Date().toISOString(), item.product_id);
      }
      db.prepare("DELETE FROM stock_movements WHERE reference_id = ? OR (reference_type = 'purchase' AND reference_id = ?)").run(pur.purchase_number, pur.purchase_number);
      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id);
      db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_ACHAT', 'purchases', id, { purchase_number: pur.purchase_number });
    })();

    res.json({ success: true, message: `Réception ${pur.purchase_number} supprimée et stock ajusté` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. SALES (VENTES), INVOICES & DELIVERIES
// ----------------------------------------------------
app.get('/api/sales', (req: Request, res: Response) => {
  try {
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      ORDER BY s.date DESC, s.created_at DESC
    `).all();

    for (const sale of sales as any[]) {
      sale.items = db.prepare(`
        SELECT si.*, pr.name as product_name, pr.code as product_code
        FROM sale_items si
        JOIN products pr ON si.product_id = pr.id
        WHERE si.sale_id = ?
      `).all(sale.id);
    }

    res.json(sales);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', (req: Request, res: Response) => {
  try {
    const {
      date, customer_id, delivery_type, items, discount = 0,
      paid_amount = 0, payment_method = 'especes', notes, created_by = 'Commercial',
      delivery_address, driver_name, vehicle_info
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'La vente doit comporter au moins un produit.' });
    }

    // 1. Verify availability and prevent negative stocks!
    for (const it of items) {
      const prod = db.prepare('SELECT current_stock, reserved_stock, name FROM products WHERE id = ?').get(it.product_id) as any;
      if (!prod) {
        return res.status(400).json({ error: `Produit introuvable.` });
      }
      const availableStock = prod.current_stock - prod.reserved_stock;
      if (Number(it.quantity) > availableStock) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${prod.name}". Stock disponible: ${availableStock} sacs, quantité demandée: ${it.quantity} sacs.`
        });
      }
    }

    const saleId = 'sal-' + Date.now();
    const now = new Date().toISOString();
    const countSales = (db.prepare('SELECT COUNT(*) as c FROM sales').get() as { c: number }).c + 1;
    const sale_number = `VNT-2026-${String(countSales).padStart(3, '0')}`;
    const invoice_number = `FAC-2026-${String(countSales).padStart(3, '0')}`;

    let subtotal = 0;
    for (const it of items) {
      subtotal += Number(it.quantity) * Number(it.unit_price) - (Number(it.discount) || 0);
    }
    const total_amount = Math.max(0, subtotal - Number(discount));
    const paid = Math.min(total_amount, Number(paid_amount) || 0);
    const remaining_amount = total_amount - paid;
    const payment_status = paid >= total_amount ? 'payee' : (paid > 0 ? 'partielle' : 'impayee');
    const isDirect = delivery_type === 'emporte_immediat';
    const delivery_status = isDirect ? 'livree' : 'en_attente';

    db.transaction(() => {
      // 1. Create Sale
      db.prepare(`
        INSERT INTO sales (
          id, sale_number, date, customer_id, delivery_type, subtotal, discount,
          total_amount, paid_amount, remaining_amount, payment_status, payment_method,
          delivery_status, created_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId, sale_number, date, customer_id, delivery_type, subtotal, discount,
        total_amount, paid, remaining_amount, payment_status, payment_method,
        delivery_status, created_by, notes || '', now
      );

      // 2. Insert items and update stock or reservations
      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total_price, delivered_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items) {
        const itemId = 'sitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const qty = Number(it.quantity);
        const price = Number(it.unit_price);
        const disc = Number(it.discount) || 0;
        const lineTotal = (qty * price) - disc;
        const deliveredQty = isDirect ? qty : 0;

        insertSaleItem.run(itemId, saleId, it.product_id, qty, price, disc, lineTotal, deliveredQty);

        const currentProd = db.prepare('SELECT current_stock, reserved_stock, purchase_price FROM products WHERE id = ?').get(it.product_id) as any;

        if (isDirect) {
          // Direct pickup: immediate stock deduction
          const prev = currentProd.current_stock;
          const newStk = prev - qty;
          db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(newStk, now, it.product_id);

          // Stock movement
          const movId = 'mov-out-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO stock_movements (
              id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price,
              reference_type, reference_id, created_by, reason, created_at
            ) VALUES (?, ?, ?, 'SORTIE_VENTE_DIRECTE', ?, ?, ?, ?, 'sale', ?, ?, 'Vente emportée au comptoir', ?)
          `).run(movId, date, it.product_id, qty, prev, newStk, price, sale_number, created_by, now);
        } else {
          // Delivery to follow: reserve quantity
          const newRes = currentProd.reserved_stock + qty;
          db.prepare('UPDATE products SET reserved_stock = ?, updated_at = ? WHERE id = ?').run(newRes, now, it.product_id);
        }
      }

      // 3. Create Delivery record if to be delivered later
      if (!isDirect) {
        const countDel = (db.prepare('SELECT COUNT(*) as c FROM deliveries').get() as { c: number }).c + 1;
        const delNum = `BL-2026-${String(countDel).padStart(3, '0')}`;
        const delId = 'del-' + Date.now();
        db.prepare(`
          INSERT INTO deliveries (id, delivery_number, date, sale_id, customer_id, delivery_address, driver_name, vehicle_info, status, notes, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?, ?, ?)
        `).run(delId, delNum, date, saleId, customer_id, delivery_address || 'Sur chantier', driver_name || 'À désigner', vehicle_info || 'Camion dépôt', notes || '', created_by, now);

        for (const it of items) {
          db.prepare(`
            INSERT INTO delivery_items (id, delivery_id, product_id, quantity_ordered, quantity_delivered, quantity_remaining)
            VALUES (?, ?, ?, ?, 0, ?)
          `).run('ditem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), delId, it.product_id, it.quantity, it.quantity);
        }
      }

      // 4. Auto-generate Invoice
      const invoiceId = 'fac-' + Date.now();
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, date, due_date, sale_id, customer_id, subtotal, discount,
          total_amount, paid_amount, remaining_amount, payment_status, status, created_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'validee', ?, ?, ?)
      `).run(invoiceId, invoice_number, date, date, saleId, customer_id, subtotal, discount, total_amount, paid, remaining_amount, payment_status, created_by, notes || '', now);

      for (const it of items) {
        const fItemId = 'fitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, discount, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(fItemId, invoiceId, it.product_id, it.quantity, it.unit_price, it.discount || 0, (it.quantity * it.unit_price) - (it.discount || 0));
      }

      // 5. If paid amount > 0, generate payment & cash transaction
      if (paid > 0) {
        const countPay = (db.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c + 1;
        const payment_number = `REC-2026-${String(countPay).padStart(3, '0')}`;
        const payId = 'pay-' + Date.now();

        db.prepare(`
          INSERT INTO payments (id, payment_number, date, customer_id, sale_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAIEMENT-INITIAL', 'Règlement lors de la vente', ?, ?)
        `).run(payId, payment_number, date, customer_id, saleId, invoiceId, paid, payment_method, created_by, now);

        db.prepare(`
          INSERT INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
          VALUES (?, ?, 'ENCAISSEMENT_VENTE', ?, ?, ?, 'payment', ?, ?, 'Vente ' || ?, ?)
        `).run('csh-' + Date.now(), date, paid, payment_method, payId, payment_number, created_by, sale_number, now);
      }
    })();

    logAudit(created_by, created_by, 'VENTE', 'sales', saleId, { sale_number, total_amount, paid });
    res.status(201).json({ id: saleId, sale_number, invoice_number, total_amount, paid_amount: paid, remaining_amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any;
    if (!sale) return res.status(404).json({ error: 'Vente non trouvée' });

    db.transaction(() => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[];
      for (const item of items) {
        if (sale.delivery_mode === 'immediat') {
          db.prepare(`
            UPDATE products 
            SET current_stock = current_stock + ?, updated_at = ?
            WHERE id = ?
          `).run(item.quantity, new Date().toISOString(), item.product_id);
        } else {
          const remainingToDeliver = Math.max(0, item.quantity - (item.delivered_quantity || 0));
          db.prepare(`
            UPDATE products 
            SET reserved_stock = MAX(0, reserved_stock - ?),
                current_stock = current_stock + ?,
                updated_at = ?
            WHERE id = ?
          `).run(remainingToDeliver, item.delivered_quantity || 0, new Date().toISOString(), item.product_id);
        }
      }

      // Delete invoices and invoice items
      const invoices = db.prepare('SELECT id FROM invoices WHERE sale_id = ?').all(id) as any[];
      for (const inv of invoices) {
        db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(inv.id);
        db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(inv.id);
      }
      db.prepare('DELETE FROM invoices WHERE sale_id = ?').run(id);

      // Delete payments
      db.prepare('DELETE FROM payments WHERE sale_id = ?').run(id);
      db.prepare("DELETE FROM cash_transactions WHERE reference_id = ? OR notes LIKE ?").run(id, `%${sale.sale_number}%`);

      // Delete deliveries
      const dels = db.prepare('SELECT id FROM deliveries WHERE sale_id = ?').all(id) as any[];
      for (const d of dels) {
        db.prepare('DELETE FROM delivery_items WHERE delivery_id = ?').run(d.id);
      }
      db.prepare('DELETE FROM deliveries WHERE sale_id = ?').run(id);

      // Delete stock movements
      db.prepare("DELETE FROM stock_movements WHERE reference_id = ? OR reason LIKE ?").run(sale.sale_number, `%${sale.sale_number}%`);

      // Delete sale items & sale
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
      db.prepare('DELETE FROM sales WHERE id = ?').run(id);

      logAudit('admin', 'Administrateur', 'SUPPRESSION_VENTE', 'sales', id, { sale_number: sale.sale_number });
    })();

    res.json({ success: true, message: `Vente ${sale.sale_number} supprimée et stocks/comptabilité restaurés` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. DELIVERIES (GESTION DES LIVRAISONS EFFECTIVES)
// ----------------------------------------------------
app.get('/api/deliveries', (req: Request, res: Response) => {
  try {
    const deliveries = db.prepare(`
      SELECT d.*, c.name as customer_name, s.sale_number
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      JOIN sales s ON d.sale_id = s.id
      ORDER BY d.date DESC, d.created_at DESC
    `).all();

    for (const del of deliveries as any[]) {
      del.items = db.prepare(`
        SELECT di.*, p.name as product_name, p.code as product_code
        FROM delivery_items di
        JOIN products p ON di.product_id = p.id
        WHERE di.delivery_id = ?
      `).all(del.id);
    }

    res.json(deliveries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate or register actual delivery departure/dropoff
app.post('/api/deliveries/:id/execute', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delivery_items, driver_name, vehicle_info, notes, created_by = 'Gestionnaire Stock' } = req.body;

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as any;
    if (!delivery) {
      return res.status(404).json({ error: 'Livraison introuvable.' });
    }

    const now = new Date().toISOString();
    const dateToday = now.split('T')[0];

    db.transaction(() => {
      let allDelivered = true;

      for (const item of delivery_items) {
        const qtyToDeliver = Number(item.quantity_to_deliver) || 0;
        if (qtyToDeliver <= 0) continue;

        const prod = db.prepare('SELECT current_stock, reserved_stock, purchase_price, name FROM products WHERE id = ?').get(item.product_id) as any;
        if (qtyToDeliver > prod.current_stock) {
          throw new Error(`Stock physique insuffisant pour ${prod.name} (${prod.current_stock} sacs disponibles en dépôt).`);
        }

        // Deduct from current_stock and reserved_stock
        const prevStk = prod.current_stock;
        const newStk = Math.max(0, prevStk - qtyToDeliver);
        const newRes = Math.max(0, prod.reserved_stock - qtyToDeliver);

        db.prepare('UPDATE products SET current_stock = ?, reserved_stock = ?, updated_at = ? WHERE id = ?')
          .run(newStk, newRes, now, item.product_id);

        // Record stock movement: SORTIE_LIVRAISON
        const movId = 'mov-del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO stock_movements (
            id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price,
            reference_type, reference_id, created_by, reason, created_at
          ) VALUES (?, ?, ?, 'SORTIE_LIVRAISON', ?, ?, ?, ?, 'delivery', ?, ?, ?, ?)
        `).run(movId, dateToday, item.product_id, qtyToDeliver, prevStk, newStk, prod.purchase_price, delivery.delivery_number, created_by, `Livraison sur chantier ${delivery.delivery_address}`, now);

        // Update delivery_items delivered and remaining
        const existingDi = db.prepare('SELECT quantity_ordered, quantity_delivered FROM delivery_items WHERE delivery_id = ? AND product_id = ?').get(id, item.product_id) as any;
        if (existingDi) {
          const totalDel = existingDi.quantity_delivered + qtyToDeliver;
          const remaining = Math.max(0, existingDi.quantity_ordered - totalDel);
          db.prepare('UPDATE delivery_items SET quantity_delivered = ?, quantity_remaining = ? WHERE delivery_id = ? AND product_id = ?')
            .run(totalDel, remaining, id, item.product_id);

          if (remaining > 0) allDelivered = false;
        }

        // Update sale_items delivered_quantity
        db.prepare(`
          UPDATE sale_items SET delivered_quantity = delivered_quantity + ?
          WHERE sale_id = ? AND product_id = ?
        `).run(qtyToDeliver, delivery.sale_id, item.product_id);
      }

      // Check overall delivery status
      const delStatus = allDelivered ? 'livree' : 'partielle';
      db.prepare(`
        UPDATE deliveries SET
          status = ?, driver_name = COALESCE(?, driver_name), vehicle_info = COALESCE(?, vehicle_info),
          notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(delStatus, driver_name || null, vehicle_info || null, notes || null, id);

      // Also update sales delivery_status
      db.prepare('UPDATE sales SET delivery_status = ? WHERE id = ?').run(delStatus, delivery.sale_id);
    })();

    logAudit(created_by, created_by, 'LIVRAISON_EFFECTUEE', 'deliveries', id, { delivery_number: delivery.delivery_number });
    res.json({ success: true, message: 'Livraison enregistrée avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/deliveries/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as any;
    if (!del) return res.status(404).json({ error: 'Livraison non trouvée' });

    db.transaction(() => {
      const items = db.prepare('SELECT * FROM delivery_items WHERE delivery_id = ?').all(id) as any[];
      for (const item of items) {
        if (item.quantity_delivered > 0) {
          db.prepare(`
            UPDATE products 
            SET current_stock = current_stock + ?, reserved_stock = reserved_stock + ?, updated_at = ?
            WHERE id = ?
          `).run(item.quantity_delivered, item.quantity_delivered, new Date().toISOString(), item.product_id);
        }

        if (del.sale_id && item.quantity_delivered > 0) {
          db.prepare(`
            UPDATE sale_items
            SET delivered_quantity = MAX(0, delivered_quantity - ?)
            WHERE sale_id = ? AND product_id = ?
          `).run(item.quantity_delivered, del.sale_id, item.product_id);
        }
      }

      db.prepare("DELETE FROM stock_movements WHERE reference_id = ? OR (reference_type = 'delivery' AND reference_id = ?)").run(del.delivery_number, del.delivery_number);
      db.prepare('DELETE FROM delivery_items WHERE delivery_id = ?').run(id);
      db.prepare('DELETE FROM deliveries WHERE id = ?').run(id);

      if (del.sale_id) {
        db.prepare("UPDATE sales SET delivery_status = 'en_attente' WHERE id = ?").run(del.sale_id);
      }

      logAudit('admin', 'Administrateur', 'SUPPRESSION_LIVRAISON', 'deliveries', id, { delivery_number: del.delivery_number });
    })();

    res.json({ success: true, message: `Bon de livraison ${del.delivery_number} supprimé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. QUOTATIONS (DEVIS)
// ----------------------------------------------------
app.get('/api/quotations', (req: Request, res: Response) => {
  try {
    const quotations = db.prepare(`
      SELECT q.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      ORDER BY q.date DESC, q.created_at DESC
    `).all();

    for (const quo of quotations as any[]) {
      quo.items = db.prepare(`
        SELECT qi.*, p.name as product_name, p.code as product_code
        FROM quotation_items qi
        JOIN products p ON qi.product_id = p.id
        WHERE qi.quotation_id = ?
      `).all(quo.id);
    }

    res.json(quotations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations', (req: Request, res: Response) => {
  try {
    const { date, expiry_date, customer_id, items, discount = 0, notes, created_by = 'Commercial' } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Le devis doit comporter au moins un produit.' });
    }

    const id = 'quo-' + Date.now();
    const count = (db.prepare('SELECT COUNT(*) as c FROM quotations').get() as { c: number }).c + 1;
    const quote_number = `DEV-2026-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();

    let subtotal = 0;
    for (const it of items) {
      subtotal += Number(it.quantity) * Number(it.unit_price) - (Number(it.discount) || 0);
    }
    const total_amount = Math.max(0, subtotal - Number(discount));

    db.transaction(() => {
      db.prepare(`
        INSERT INTO quotations (id, quote_number, date, expiry_date, customer_id, subtotal, discount, total_amount, status, created_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'envoye', ?, ?, ?)
      `).run(id, quote_number, date, expiry_date, customer_id, subtotal, discount, total_amount, created_by, notes || '', now);

      const insertItem = db.prepare(`
        INSERT INTO quotation_items (id, quotation_id, product_id, quantity, unit_price, discount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items) {
        const itemId = 'qitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const lineTotal = (Number(it.quantity) * Number(it.unit_price)) - (Number(it.discount) || 0);
        insertItem.run(itemId, id, it.product_id, it.quantity, it.unit_price, it.discount || 0, lineTotal);
      }
    })();

    res.status(201).json({ id, quote_number, total_amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/quotations/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Convert quotation to sale
app.post('/api/quotations/:id/convert-to-sale', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delivery_type = 'emporte_immediat', paid_amount = 0, payment_method = 'especes', created_by = 'Commercial' } = req.body;

    const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as any;
    if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
    if (quote.converted_to_sale_id) {
      return res.status(400).json({ error: 'Ce devis a déjà été converti en vente.' });
    }

    const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(id) as any[];

    // Forward to sale creation logic internally
    // We can execute sale creation
    // 1. Verify stocks
    for (const it of items) {
      const prod = db.prepare('SELECT current_stock, reserved_stock, name FROM products WHERE id = ?').get(it.product_id) as any;
      const availableStock = prod.current_stock - prod.reserved_stock;
      if (Number(it.quantity) > availableStock) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${prod.name}" lors de la conversion. Disponible: ${availableStock} sacs.`
        });
      }
    }

    const saleId = 'sal-' + Date.now();
    const now = new Date().toISOString();
    const countSales = (db.prepare('SELECT COUNT(*) as c FROM sales').get() as { c: number }).c + 1;
    const sale_number = `VNT-2026-${String(countSales).padStart(3, '0')}`;
    const invoice_number = `FAC-2026-${String(countSales).padStart(3, '0')}`;
    const total_amount = quote.total_amount;
    const paid = Math.min(total_amount, Number(paid_amount) || 0);
    const remaining_amount = total_amount - paid;
    const payment_status = paid >= total_amount ? 'payee' : (paid > 0 ? 'partielle' : 'impayee');
    const isDirect = delivery_type === 'emporte_immediat';
    const delivery_status = isDirect ? 'livree' : 'en_attente';
    const dateToday = now.split('T')[0];

    db.transaction(() => {
      db.prepare(`
        INSERT INTO sales (
          id, sale_number, date, customer_id, delivery_type, subtotal, discount,
          total_amount, paid_amount, remaining_amount, payment_status, payment_method,
          delivery_status, created_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId, sale_number, dateToday, quote.customer_id, delivery_type, quote.subtotal, quote.discount,
        total_amount, paid, remaining_amount, payment_status, payment_method,
        delivery_status, created_by, `Converti depuis le devis ${quote.quote_number}`, now
      );

      for (const it of items) {
        const itemId = 'sitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const deliveredQty = isDirect ? it.quantity : 0;
        db.prepare(`
          INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total_price, delivered_quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, saleId, it.product_id, it.quantity, it.unit_price, it.discount, it.total_price, deliveredQty);

        const currentProd = db.prepare('SELECT current_stock, reserved_stock, purchase_price FROM products WHERE id = ?').get(it.product_id) as any;

        if (isDirect) {
          const prev = currentProd.current_stock;
          const newStk = prev - it.quantity;
          db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(newStk, now, it.product_id);

          const movId = 'mov-out-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO stock_movements (
              id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price,
              reference_type, reference_id, created_by, reason, created_at
            ) VALUES (?, ?, ?, 'SORTIE_VENTE_DIRECTE', ?, ?, ?, ?, 'sale', ?, ?, 'Vente issue devis', ?)
          `).run(movId, dateToday, it.product_id, it.quantity, prev, newStk, it.unit_price, sale_number, created_by, now);
        } else {
          const newRes = currentProd.reserved_stock + it.quantity;
          db.prepare('UPDATE products SET reserved_stock = ?, updated_at = ? WHERE id = ?').run(newRes, now, it.product_id);
        }
      }

      // Generate invoice
      const invoiceId = 'fac-' + Date.now();
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, date, due_date, sale_id, customer_id, subtotal, discount,
          total_amount, paid_amount, remaining_amount, payment_status, status, created_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'validee', ?, ?, ?)
      `).run(invoiceId, invoice_number, dateToday, dateToday, saleId, quote.customer_id, quote.subtotal, quote.discount, total_amount, paid, remaining_amount, payment_status, created_by, `Facture issue du devis ${quote.quote_number}`, now);

      for (const it of items) {
        db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, discount, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('fitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), invoiceId, it.product_id, it.quantity, it.unit_price, it.discount, it.total_price);
      }

      if (paid > 0) {
        const countPay = (db.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c + 1;
        const payment_number = `REC-2026-${String(countPay).padStart(3, '0')}`;
        const payId = 'pay-' + Date.now();

        db.prepare(`
          INSERT INTO payments (id, payment_number, date, customer_id, sale_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAIEMENT-CONVERSION', 'Règlement conversion devis', ?, ?)
        `).run(payId, payment_number, dateToday, quote.customer_id, saleId, invoiceId, paid, payment_method, created_by, now);

        db.prepare(`
          INSERT INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
          VALUES (?, ?, 'ENCAISSEMENT_VENTE', ?, ?, ?, 'payment', ?, ?, 'Vente ' || ?, ?)
        `).run('csh-' + Date.now(), dateToday, paid, payment_method, payId, payment_number, created_by, sale_number, now);
      }

      // Mark quote as accepted & converted
      db.prepare("UPDATE quotations SET status = 'accepte', converted_to_sale_id = ?, converted_to_invoice_id = ? WHERE id = ?")
        .run(saleId, invoiceId, id);
    })();

    res.json({ success: true, sale_number, invoice_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const q = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as any;
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });

    db.transaction(() => {
      db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id);
      db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_DEVIS', 'quotations', id, { quote_number: q.quote_number });
    })();

    res.json({ success: true, message: `Devis ${q.quote_number} supprimé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. INVOICES (FACTURES)
// ----------------------------------------------------
app.get('/api/invoices', (req: Request, res: Response) => {
  try {
    const invoices = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, s.sale_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN sales s ON i.sale_id = s.id
      ORDER BY i.date DESC, i.created_at DESC
    `).all();

    for (const inv of invoices as any[]) {
      inv.items = db.prepare(`
        SELECT ii.*, p.name as product_name, p.code as product_code
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `).all(inv.id);
    }

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, user_name = 'Administrateur' } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Un motif d'annulation motivé est obligatoire." });
    }

    db.prepare("UPDATE invoices SET status = 'annulee', cancellation_reason = ? WHERE id = ?").run(reason, id);
    logAudit(user_name, user_name, 'ANNULATION_FACTURE', 'invoices', id, { reason });
    res.json({ success: true, message: 'Facture annulée avec traçabilité.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) return res.status(404).json({ error: 'Facture non trouvée' });

    db.transaction(() => {
      db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_FACTURE', 'invoices', id, { invoice_number: inv.invoice_number });
    })();

    res.json({ success: true, message: `Facture ${inv.invoice_number} supprimée` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. PAYMENTS (RECETTES) & CASH TRANSACTIONS
// ----------------------------------------------------
app.get('/api/payments', (req: Request, res: Response) => {
  try {
    const payments = db.prepare(`
      SELECT p.*, c.name as customer_name, i.invoice_number, s.sale_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN sales s ON p.sale_id = s.id
      ORDER BY p.date DESC, p.created_at DESC
    `).all();
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', (req: Request, res: Response) => {
  try {
    const { customer_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by = 'Caissier' } = req.body;
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'Montant de paiement invalide.' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id) as any;
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });

    if (payAmount > invoice.remaining_amount) {
      return res.status(400).json({
        error: `Le montant (${payAmount} FCFA) dépasse le solde restant dû (${invoice.remaining_amount} FCFA).`
      });
    }

    const id = 'pay-' + Date.now();
    const countPay = (db.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c + 1;
    const payment_number = `REC-2026-${String(countPay).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const dateToday = now.split('T')[0];

    db.transaction(() => {
      // 1. Insert Payment
      db.prepare(`
        INSERT INTO payments (id, payment_number, date, customer_id, sale_id, invoice_id, amount, payment_method, transaction_ref, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, payment_number, dateToday, customer_id, invoice.sale_id, invoice_id, payAmount, payment_method, transaction_ref || '', notes || '', created_by, now);

      // 2. Update Invoice
      const newPaid = invoice.paid_amount + payAmount;
      const newRemaining = Math.max(0, invoice.total_amount - newPaid);
      const newStatus = newRemaining === 0 ? 'payee' : 'partielle';

      db.prepare('UPDATE invoices SET paid_amount = ?, remaining_amount = ?, payment_status = ? WHERE id = ?')
        .run(newPaid, newRemaining, newStatus, invoice_id);

      // 3. Update Sale
      db.prepare('UPDATE sales SET paid_amount = paid_amount + ?, remaining_amount = remaining_amount - ?, payment_status = ? WHERE id = ?')
        .run(payAmount, payAmount, newStatus, invoice.sale_id);

      // 4. Log in Cash transactions
      db.prepare(`
        INSERT INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
        VALUES (?, ?, 'PAIEMENT_FACTURE', ?, ?, ?, 'payment', ?, ?, 'Paiement facture ' || ?, ?)
      `).run('csh-' + Date.now(), dateToday, payAmount, payment_method, id, payment_number, created_by, invoice.invoice_number, now);
    })();

    logAudit(created_by, created_by, 'ENCAISSEMENT', 'payments', id, { payment_number, amount: payAmount, invoice_number: invoice.invoice_number });
    res.status(201).json({ id, payment_number, amount: payAmount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!pay) return res.status(404).json({ error: 'Règlement non trouvé' });

    db.transaction(() => {
      if (pay.invoice_id) {
        const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(pay.invoice_id) as any;
        if (inv) {
          const newPaid = Math.max(0, inv.paid_amount - pay.amount);
          const newRemaining = inv.total_amount - newPaid;
          const newStatus = newPaid <= 0 ? 'impayee' : (newPaid < inv.total_amount ? 'partielle' : 'payee');
          db.prepare(`
            UPDATE invoices
            SET paid_amount = ?, remaining_amount = ?, payment_status = ?
            WHERE id = ?
          `).run(newPaid, newRemaining, newStatus, pay.invoice_id);
        }
      }

      if (pay.sale_id) {
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(pay.sale_id) as any;
        if (sale) {
          const newPaid = Math.max(0, sale.paid_amount - pay.amount);
          const newRemaining = sale.total_amount - newPaid;
          const newStatus = newPaid <= 0 ? 'impayee' : (newPaid < sale.total_amount ? 'partielle' : 'payee');
          db.prepare(`
            UPDATE sales
            SET paid_amount = ?, remaining_amount = ?, payment_status = ?
            WHERE id = ?
          `).run(newPaid, newRemaining, newStatus, pay.sale_id);
        }
      }

      db.prepare("DELETE FROM cash_transactions WHERE reference_id = ? OR notes LIKE ?").run(id, `%${pay.payment_number}%`);
      db.prepare('DELETE FROM payments WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_PAIEMENT', 'payments', id, { payment_number: pay.payment_number, amount: pay.amount });
    })();

    res.json({ success: true, message: `Règlement ${pay.payment_number} supprimé et solde recalculé` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 11. EXPENSES (DÉPENSES)
// ----------------------------------------------------
app.get('/api/expenses', (req: Request, res: Response) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all();
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', (req: Request, res: Response) => {
  try {
    const { date, category, description, amount, payment_method = 'especes', receipt_ref, approved_by, created_by = 'Caissier' } = req.body;
    const expAmount = Number(amount);
    if (!expAmount || expAmount <= 0) {
      return res.status(400).json({ error: 'Montant de dépense invalide.' });
    }

    const id = 'exp-' + Date.now();
    const countExp = (db.prepare('SELECT COUNT(*) as c FROM expenses').get() as { c: number }).c + 1;
    const expense_number = `DEP-2026-${String(countExp).padStart(3, '0')}`;
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, expense_number, date, category, description, amount, payment_method, receipt_ref, approved_by, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, expense_number, date, category, description, expAmount, payment_method, receipt_ref || '', approved_by || 'Direction', created_by, now);

      db.prepare(`
        INSERT INTO cash_transactions (id, date, type, amount, payment_method, reference_id, reference_type, reference_number, created_by, notes, created_at)
        VALUES (?, ?, 'DEPENSE', ?, ?, ?, 'expense', ?, ?, ?, ?)
      `).run('csh-' + Date.now(), date, -expAmount, payment_method, id, expense_number, created_by, description, now);
    })();

    logAudit(created_by, created_by, 'DEPENSE', 'expenses', id, { expense_number, amount: expAmount });
    res.status(201).json({ id, expense_number, amount: expAmount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;
    if (!exp) return res.status(404).json({ error: 'Dépense non trouvée' });

    db.transaction(() => {
      db.prepare("DELETE FROM cash_transactions WHERE reference_id = ? OR notes LIKE ?").run(id, `%${exp.expense_number}%`);
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_DEPENSE', 'expenses', id, { expense_number: exp.expense_number, amount: exp.amount });
    })();

    res.json({ success: true, message: `Dépense ${exp.expense_number} supprimée` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 12. CASH FLOW (CAISSE EN TEMPS RÉEL)
// ----------------------------------------------------
app.get('/api/cash', (req: Request, res: Response) => {
  try {
    const transactions = db.prepare('SELECT * FROM cash_transactions ORDER BY date DESC, created_at DESC LIMIT 200').all();

    const totalsByMethod = db.prepare(`
      SELECT payment_method, SUM(amount) as balance
      FROM cash_transactions
      GROUP BY payment_method
    `).all() as { payment_method: string; balance: number }[];

    const totalCash = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions').get() as { total: number }).total;

    res.json({
      total_balance: totalCash,
      by_method: totalsByMethod,
      transactions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 13. PHYSICAL INVENTORY (INVENTAIRE PHYSIQUE)
// ----------------------------------------------------
app.get('/api/inventory/adjustments', (req: Request, res: Response) => {
  try {
    const adjustments = db.prepare(`
      SELECT a.*, p.name as product_name, p.code as product_code
      FROM inventory_adjustments a
      JOIN products p ON a.product_id = p.id
      ORDER BY a.date DESC, a.created_at DESC
    `).all();
    res.json(adjustments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjustments', (req: Request, res: Response) => {
  try {
    const { product_id, physical_stock, reason, validated_by, created_by = 'Gestionnaire Stock' } = req.body;
    const physStock = Number(physical_stock);
    if (isNaN(physStock) || physStock < 0) {
      return res.status(400).json({ error: 'Quantité physique invalide.' });
    }

    const prod = db.prepare('SELECT current_stock, purchase_price, name FROM products WHERE id = ?').get(product_id) as any;
    if (!prod) return res.status(404).json({ error: 'Produit introuvable.' });

    const theoreticalStock = prod.current_stock;
    const discrepancy = physStock - theoreticalStock;
    if (discrepancy === 0) {
      return res.status(400).json({ error: 'Aucun écart constaté entre le stock théorique et physique.' });
    }

    const id = 'adj-' + Date.now();
    const count = (db.prepare('SELECT COUNT(*) as c FROM inventory_adjustments').get() as { c: number }).c + 1;
    const adjustment_number = `INV-2026-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const dateToday = now.split('T')[0];
    const movType = discrepancy > 0 ? 'AJUSTEMENT_INVENTAIRE_PLUS' : 'AJUSTEMENT_INVENTAIRE_MOINS';

    db.transaction(() => {
      db.prepare(`
        INSERT INTO inventory_adjustments (id, adjustment_number, date, product_id, theoretical_stock, physical_stock, discrepancy, reason, validated_by, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, adjustment_number, dateToday, product_id, theoreticalStock, physStock, discrepancy, reason || 'Régularisation inventaire physique', validated_by || 'Direction', created_by, now);

      db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(physStock, now, product_id);

      db.prepare(`
        INSERT INTO stock_movements (
          id, date, product_id, movement_type, quantity, previous_stock, new_stock, unit_price,
          reference_type, reference_id, created_by, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inventory', ?, ?, ?, ?)
      `).run('mov-' + Date.now(), dateToday, product_id, movType, Math.abs(discrepancy), theoreticalStock, physStock, prod.purchase_price, adjustment_number, created_by, reason || 'Ajustement inventaire', now);
    })();

    logAudit(created_by, created_by, 'AJUSTEMENT_INVENTAIRE', 'products', product_id, { adjustment_number, discrepancy });
    res.status(201).json({ id, adjustment_number, discrepancy, physical_stock: physStock });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/adjustments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adj = db.prepare('SELECT * FROM inventory_adjustments WHERE id = ?').get(id) as any;
    if (!adj) return res.status(404).json({ error: 'Ajustement non trouvé' });

    db.transaction(() => {
      // Reverse discrepancy in product current_stock
      db.prepare(`
        UPDATE products 
        SET current_stock = MAX(0, current_stock - ?), updated_at = ?
        WHERE id = ?
      `).run(adj.discrepancy, new Date().toISOString(), adj.product_id);

      db.prepare("DELETE FROM stock_movements WHERE reference_id = ? OR (reference_type = 'inventory' AND reference_id = ?)").run(adj.adjustment_number, adj.adjustment_number);
      db.prepare('DELETE FROM inventory_adjustments WHERE id = ?').run(id);
      logAudit('admin', 'Administrateur', 'SUPPRESSION_AJUSTEMENT_INVENTAIRE', 'inventory_adjustments', id, { adjustment_number: adj.adjustment_number });
    })();

    res.json({ success: true, message: `Régularisation ${adj.adjustment_number} supprimée` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 14. REPORTS (RAPPORTS JOURNALIERS, HEBDO, MENSUELS)
// ----------------------------------------------------
app.get('/api/reports', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, productId, brand } = req.query as {
      startDate?: string;
      endDate?: string;
      productId?: string;
      brand?: string;
    };

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    // 1. Initial Stock at start date
    // 2. Received bags during period
    const receivedBags = (db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as qty
      FROM stock_movements
      WHERE movement_type = 'ENTREE_ACHAT' AND date >= ? AND date <= ?
      ${productId ? 'AND product_id = ?' : ''}
    `).get(...(productId ? [start, end, productId] : [start, end])) as { qty: number }).qty;

    // 3. Delivered bags
    const deliveredBags = (db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as qty
      FROM stock_movements
      WHERE movement_type = 'SORTIE_LIVRAISON' AND date >= ? AND date <= ?
      ${productId ? 'AND product_id = ?' : ''}
    `).get(...(productId ? [start, end, productId] : [start, end])) as { qty: number }).qty;

    // 4. Sold bags (both direct & to deliver)
    const soldBags = (db.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as qty
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.date >= ? AND s.date <= ?
      ${productId ? 'AND si.product_id = ?' : ''}
    `).get(...(productId ? [start, end, productId] : [start, end])) as { qty: number }).qty;

    // Current total stock
    const currentStockBags = (db.prepare(`
      SELECT COALESCE(SUM(current_stock), 0) as qty FROM products WHERE is_active = 1
      ${productId ? 'AND id = ?' : ''}
    `).get(...(productId ? [productId] : [])) as { qty: number }).qty;

    // Financial KPIs
    const turnoverCA = (db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE date >= ? AND date <= ?
    `).get(start, end) as { total: number }).total;

    const receiptsCollected = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date >= ? AND date <= ?
    `).get(start, end) as { total: number }).total;

    const expensesTotal = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?
    `).get(start, end) as { total: number }).total;

    const customerDebtsGenerated = (db.prepare(`
      SELECT COALESCE(SUM(remaining_amount), 0) as total FROM sales WHERE date >= ? AND date <= ?
    `).get(start, end) as { total: number }).total;

    // Estimated COGS (Coût des marchandises vendues)
    const cogs = (db.prepare(`
      SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0) as cogs
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.date >= ? AND s.date <= ?
    `).get(start, end) as { cogs: number }).cogs;

    const grossMargin = turnoverCA - cogs;

    const salesCount = (db.prepare(`SELECT COUNT(*) as count FROM sales WHERE date >= ? AND date <= ?`).get(start, end) as { count: number }).count;
    const invoicesCount = (db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE date >= ? AND date <= ?`).get(start, end) as { count: number }).count;

    // Top selling products
    const topProducts = db.prepare(`
      SELECT p.name, p.brand, SUM(si.quantity) as total_bags, SUM(si.total_price) as total_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.date >= ? AND s.date <= ?
      GROUP BY p.id
      ORDER BY total_bags DESC
      LIMIT 10
    `).all(start, end);

    // Sales by day in period
    const dailyBreakdown = db.prepare(`
      SELECT date, COUNT(*) as sales_count, SUM(total_amount) as ca, SUM(paid_amount) as receipts
      FROM sales
      WHERE date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(start, end);

    res.json({
      period: { start, end },
      kpis: {
        received_bags: receivedBags,
        delivered_bags: deliveredBags,
        sold_bags: soldBags,
        current_stock: currentStockBags,
        turnover_ca: turnoverCA,
        receipts_collected: receiptsCollected,
        expenses_total: expensesTotal,
        customer_debts: customerDebtsGenerated,
        cogs,
        gross_margin: grossMargin,
        sales_count: salesCount,
        invoices_count: invoicesCount,
      },
      top_products: topProducts,
      daily_breakdown: dailyBreakdown
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 15. DASHBOARD SUMMARY API
// ----------------------------------------------------
app.get('/api/dashboard', (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Counts & stocks
    const productCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get() as any).c;
    const totalStockBags = (db.prepare('SELECT COALESCE(SUM(current_stock), 0) as s FROM products WHERE is_active = 1').get() as any).s;
    const stockVal = (db.prepare('SELECT COALESCE(SUM(current_stock * purchase_price), 0) as val FROM products WHERE is_active = 1').get() as any).val;

    const totalReceivedBags = (db.prepare("SELECT COALESCE(SUM(quantity), 0) as s FROM stock_movements WHERE movement_type = 'ENTREE_ACHAT'").get() as any).s;
    const totalDeliveredBags = (db.prepare("SELECT COALESCE(SUM(quantity), 0) as s FROM stock_movements WHERE movement_type = 'SORTIE_LIVRAISON'").get() as any).s;
    const totalSoldBags = (db.prepare('SELECT COALESCE(SUM(quantity), 0) as s FROM sale_items').get() as any).s;

    // Revenues
    const caToday = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as ca FROM sales WHERE date = ?').get(today) as any).ca;
    const caWeek = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as ca FROM sales WHERE date >= ?').get(sevenDaysAgo) as any).ca;
    const caMonth = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as ca FROM sales WHERE date >= ?').get(firstDayMonth) as any).ca;

    const collectedReceipts = (db.prepare('SELECT COALESCE(SUM(amount), 0) as r FROM payments').get() as any).r;
    const totalExpenses = (db.prepare('SELECT COALESCE(SUM(amount), 0) as e FROM expenses').get() as any).e;
    const customerDebts = (db.prepare('SELECT COALESCE(SUM(remaining_amount), 0) as d FROM sales').get() as any).d;

    // Total COGS and estimated gross profit
    const totalTurnover = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as tot FROM sales').get() as any).tot;
    const totalCogs = (db.prepare(`
      SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0) as cogs
      FROM sale_items si JOIN products p ON si.product_id = p.id
    `).get() as any).cogs;
    const estimatedGrossProfit = totalTurnover - totalCogs;

    const quotesCount = (db.prepare('SELECT COUNT(*) as c FROM quotations').get() as any).c;
    const invoicesCount = (db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'validee'").get() as any).c;
    const cashBalance = (db.prepare('SELECT COALESCE(SUM(amount), 0) as bal FROM cash_transactions').get() as any).bal;

    // Alerts
    const lowStockProducts = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.current_stock <= p.min_stock AND p.is_active = 1
      ORDER BY p.current_stock ASC
    `).all();

    const unpaidInvoices = db.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.payment_status != 'payee' AND i.status = 'validee'
      ORDER BY i.remaining_amount DESC
      LIMIT 5
    `).all();

    const debtorCustomers = db.prepare(`
      SELECT c.*, SUM(s.remaining_amount) as total_debt
      FROM customers c
      JOIN sales s ON c.id = s.customer_id
      WHERE s.remaining_amount > 0
      GROUP BY c.id
      ORDER BY total_debt DESC
      LIMIT 5
    `).all();

    const pendingQuotes = db.prepare(`
      SELECT q.*, c.name as customer_name
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE q.status IN ('envoye', 'brouillon')
      ORDER BY q.date DESC
      LIMIT 5
    `).all();

    // Charts
    const salesByDay = db.prepare(`
      SELECT date, SUM(total_amount) as amount, SUM(quantity) as bags
      FROM (
        SELECT s.date, s.total_amount, (SELECT SUM(quantity) FROM sale_items WHERE sale_id = s.id) as quantity
        FROM sales s
      )
      GROUP BY date
      ORDER BY date ASC
      LIMIT 14
    `).all();

    const salesByBrand = db.prepare(`
      SELECT p.brand, SUM(si.quantity) as bags, SUM(si.total_price) as amount
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.brand
      ORDER BY bags DESC
    `).all();

    const stockByProduct = db.prepare(`
      SELECT name, current_stock as stock, min_stock
      FROM products
      WHERE is_active = 1
      ORDER BY current_stock DESC
      LIMIT 8
    `).all();

    res.json({
      product_count: productCount,
      total_stock_bags: totalStockBags,
      stock_financial_value: stockVal,
      total_received_bags: totalReceivedBags,
      total_delivered_bags: totalDeliveredBags,
      total_sold_bags: totalSoldBags,
      ca_today: caToday,
      ca_week: caWeek,
      ca_month: caMonth,
      collected_receipts: collectedReceipts,
      total_expenses: totalExpenses,
      customer_debts: customerDebts,
      estimated_gross_profit: estimatedGrossProfit,
      quotations_count: quotesCount,
      invoices_count: invoicesCount,
      cash_balance: cashBalance,
      alerts: {
        low_stock_products: lowStockProducts,
        unpaid_invoices: unpaidInvoices,
        debtor_customers: debtorCustomers,
        pending_quotes: pendingQuotes,
      },
      charts: {
        sales_by_day: salesByDay,
        sales_by_brand: salesByBrand,
        stock_by_product: stockByProduct,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 16. AUDIT LOGS & DATA MANAGEMENT
// ----------------------------------------------------
app.get('/api/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reset-demo', (req: Request, res: Response) => {
  try {
    purgeAllData();
    seedDemonstrationData();
    res.json({ success: true, message: 'Données de démonstration rechargées avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/purge-data', (req: Request, res: Response) => {
  try {
    purgeAllData();
    res.json({ success: true, message: 'Toutes les données opérationnelles ont été purgées.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 17. SERVE FRONTEND (DEV & PROD)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gestion Dépôt Ciment backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
