

export type Sale = {
    id: string; // Changed to string for Firestore auto-ID
    date: Date;
    productName: string;
    quantity: number;
    warehouseId: string; // Changed to string
    warehouseName: string;
    customerName: string;
    customerId: string; // RIF o Cédula
    unitPrice: number;
    totalAmount: number;
    saleType: 'Directa' | 'Consignación';
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta';
    documentType: 'Factura' | 'Nota de Entrega';
    invoiceNumber: string;
    user: string;
    description?: string;
    status: 'Pendiente' | 'Despachado' | 'Por Cobrar' | 'Pagado' | 'Cancelado';
    commissionRate?: number | null; // Tasa de comisión al momento de la venta
    commissionAmount?: number | null; // Monto de comisión calculado
};

// Start with no sales
export const initialSales: Sale[] = [];
