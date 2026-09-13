export type ProductionLine = {
  id: number;
  name: string;
  status: 'Activa' | 'Inactiva' | 'En Mantenimiento';
  currentProduct: string;
  outputPerHour: number;
  maintenanceDate?: Date | null;
  targetQuantity?: number | null;
  producedQuantity?: number | null;
  orderStartDate?: Date | null;
};

export const initialProductionLines: ProductionLine[] = [
  {
    id: 1,
    name: 'Línea 1',
    status: 'Activa',
    currentProduct: 'Agua Purificada 1L',
    outputPerHour: 1500,
    targetQuantity: 10000,
    producedQuantity: 4500,
    orderStartDate: new Date(new Date().setDate(new Date().getDate() - 1)),
  },
  {
    id: 2,
    name: 'Línea 2',
    status: 'Inactiva',
    currentProduct: 'N/A',
    outputPerHour: 0,
  },
  {
    id: 3,
    name: 'Línea 3',
    status: 'En Mantenimiento',
    currentProduct: 'N/A',
    outputPerHour: 0,
    maintenanceDate: new Date(new Date().setDate(new Date().getDate() + 5)),
  },
];
