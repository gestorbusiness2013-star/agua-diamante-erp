export type PurchaseOrderItem = {
    materialId: string;
    materialName: string;
    quantity: number;
    unitPrice: number;
};

export type PurchaseOrder = {
    id: string;
    orderNumber: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseOrderItem[];
    totalAmount: number;
    status: 'Pendiente' | 'Recibido' | 'Cancelado';
    date: Date;
    notes?: string;
};
