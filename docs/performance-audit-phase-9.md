# Performance Audit (Phase 9 Hardening)

This document details the performance diagnostics, query optimization, and resource caching configurations applied to the Namaste Indian Restaurant application.

---

## 1. SQL Query Optimization & N+1 Prevention

Database connections are valuable resources. Next.js server actions and loaders are designed to fetch data efficiently:

### KDS Order Items Loading (No N+1 Queries)
- **Anti-pattern**: Querying orders, then calling `.from('order_items').select()` for each individual order. On 20 orders, this generates 21 database roundtrips (N+1).
- **Hardened Implementation**: We fetch orders, collect all order IDs, and execute a single batch query for items:
  ```typescript
  const orderIds = orders.map(o => o.id);
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);
  ```
  The items are then grouped by `order_id` in-memory. This guarantees exactly **2 database queries** regardless of whether there are 5 or 500 active orders.

---

## 2. Image Loading & Asset Optimizations

- **Next.js `<Image>` Component**:
  Used on all public pages (menu displaying, story, logo). Handles automatic format negotiation (WebP/AVIF), width/height scaling, and lazy loading.
- **Menu Image Caching**:
  Images uploaded via the Admin Menu CMS are stored in Supabase Storage. Caching headers are set to `Cache-Control: public, max-age=31536000` to prevent redundant network downloads for returning customers.

---

## 3. Bundle Size & Hydration Diagnostics

During the production compile (`npm run build`):
- Shared JavaScript bundle size: **102 kB** (within safe limits).
- Dynamic client components (KDS Board, Order Cards, Order Details) utilize lazy imports and code-splitting where applicable.
- Unnecessary hooks and unused lucide icons were pruned to prevent inflating the JS payload.

---

## 4. Database Indexing Targets

To maintain rapid responses as the transaction history grows, confirm the following indexes exist (defined in the baseline schema):

1. **`orders(status, created_at)`**: Speeds up orders fetching in KDS and Admin panels.
2. **`orders(token)`**: Optimizes customer status tracking page lookups.
3. **`order_items(order_id)`**: Optimizes batch-loading of items.
4. **`rate_limits(action_type, ip_hash, created_at DESC)`**: Speeds up rate-limiting validation sweeps.
