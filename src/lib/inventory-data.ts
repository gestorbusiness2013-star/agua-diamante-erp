

export type InventoryItem = {
  id: string; // Changed to string for Firestore auto-ID
  name: string;
  quantity: number; 
  unit: string;
  status: "En Stock" | "Stock Bajo" | "Pedido";
  lowStockThreshold: number;
  supplierId?: string;
};

export type FinishedProduct = {
  id: string; // Changed to string for Firestore auto-ID
  name: string;
  quantity: number;
  zone: "Zona A" | "Zona B" | "Zona C" | "Zona D";
};

export type Recipe = Record<string, number>;
export type Recipes = Record<string, Recipe>;

export type WarehouseStockItem = {
  productName: string;
  quantity: number;
};

export type Warehouse = {
  id: string; // Changed to string for Firestore auto-ID
  name: string;
  stock: WarehouseStockItem[];
};

export type StockRequest = {
    id: string;
    warehouseId: string;
    warehouseName: string;
    productName: string;
    quantity: number;
    date: Date;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Completado';
    requestedBy: string;
};
