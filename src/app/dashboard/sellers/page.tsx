'use client';

import VendedoresPage from '@/app/dashboard/vendedores/page';

/**
 * Vista alternativa en inglés (/dashboard/sellers) para el panel de vendedores,
 * permitiendo navegación directa a cualquiera de las dos rutas (/dashboard/sellers o /dashboard/vendedores).
 */
export default function SellersPage() {
    return <VendedoresPage />;
}
