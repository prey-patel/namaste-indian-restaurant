/**
 * Application route constants.
 * Prevents hardcoded link values across the public site and admin dashboards.
 */
export const ROUTES = {
  // Public Client Paths (Locale-prefixed via routing middleware)
  home: '/',
  menu: '/menu',
  reservations: '/reservations',
  story: '/our-story',
  contact: '/contact',
  gallery: '/gallery',
  status: '/my-status',
  order: '/order',
  privacy: '/privacy-policy',
  cookie: '/cookie-policy',
  terms: '/terms',

  // Admin Portal Paths (Not locale-prefixed)
  admin: {
    login: '/admin/login',
    dashboard: '/admin',
    orders: '/admin/orders',
    reservations: '/admin/reservations',
    tables: '/admin/tables',
    menu: '/admin/menu',
    users: '/admin/users',
    analytics: '/admin/analytics',
    performance: '/admin/performance',
    settings: {
      root: '/admin/settings',
      serviceHours: '/admin/settings/service-hours',
      holidayClosures: '/admin/settings/holiday-closures',
      operationalStatus: '/admin/settings/operational-status',
      deliveryZones: '/admin/settings/delivery-zones',
      deliveryFees: '/admin/settings/delivery-fees',
      packagingFees: '/admin/settings/packaging-fees',
      siteContent: '/admin/settings/site-content',
      media: '/admin/settings/media',
    },
    exports: '/admin/exports',
    logs: '/admin/logs',
    notifications: '/admin/notifications',
    kds: '/admin/kds',
  }
} as const;
