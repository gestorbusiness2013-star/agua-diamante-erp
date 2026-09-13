

export type Movement = {
  id: string; // Changed to string for Firestore auto-ID
  date: Date;
  productName: string;
  quantity: number;
  type: 'Fabricación' | 'Transferencia' | 'Venta' | 'Anulación de Venta';
  user: string;
  details: string;
  reference?: string;
  status?: 'Completado' | 'Cancelado';
};

export const initialMovements: Omit<Movement, 'id'>[] = [
  { date: new Date('2024-05-20T10:00:00Z'), productName: 'Agua Embotellada 1L Pack 6', quantity: 100, type: 'Fabricación', user: 'Carlos Perez', details: 'Fabricado en Zona A', reference: 'FAB-1', status: 'Completado' },
  { date: new Date('2024-05-20T11:00:00Z'), productName: 'Agua Embotellada 500ml Pack 12', quantity: 50, type: 'Fabricación', user: 'Luisa Fernandez', details: 'Fabricado en Zona B', reference: 'FAB-2', status: 'Completado' },
  { date: new Date('2024-05-21T09:00:00Z'), productName: 'Agua Embotellada 1L Pack 6', quantity: 20, type: 'Transferencia', user: 'Jorge Martinez', details: 'De Fábrica a Almacén 1', reference: 'TRANSFER-3', status: 'Completado' },
];
