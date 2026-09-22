

export type SaleItem = {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
};

export type Sale = {
    id: string;
    date: Date;
    // Legacy fields (ventas antiguas con 1 solo producto)
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    // Nuevo: array de productos
    items?: SaleItem[];
    // Campos comunes
    warehouseId: string;
    warehouseName: string;
    customerName: string;
    customerId: string;
    totalAmount: number;
    saleType: 'Directa' | 'Consignación';
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta';
    documentType: 'Factura' | 'Nota de Entrega';
    invoiceNumber: string;
    user: string;
    description?: string;
    status: 'Pendiente' | 'Despachado' | 'Por Cobrar' | 'Pagado' | 'Cancelado';
    commissionRate?: number | null;
    commissionAmount?: number | null;
};

/** Helper to get items from a sale, handling legacy format */
export function getSaleItems(sale: Sale): SaleItem[] {
    if (sale.items && sale.items.length > 0) return sale.items;
    // Fallback for legacy sales with single product
    return [{
        productName: sale.productName || 'Producto',
        quantity: sale.quantity || 0,
        unitPrice: sale.unitPrice || 0,
        subtotal: sale.totalAmount || 0,
    }];
}

// Start with no sales
export const initialSales: Sale[] = [];
