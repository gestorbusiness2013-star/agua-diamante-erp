export const expenseCategories = [
    'Remodelaciones',
    'Compra de materiales',
    'Pago de nómina',
    'Mantenimiento de equipos',
    'Otros gastos'
] as const;

export type ExpenseCategory = typeof expenseCategories[number];

export type Expense = {
    id: string;
    description: string;
    responsible?: string;
    amount: number; // USD
    amountBolivares?: number;
    date: Date;
    category: ExpenseCategory;
};

export const initialExpenses: Omit<Expense, 'id'>[] = [
    { description: 'Pago de nómina Enero', responsible: 'Admin', amount: 5000, amountBolivares: 182500, date: new Date('2024-01-30'), category: 'Pago de nómina' },
    { description: 'Compra de 1000 botellas PET', responsible: 'Admin', amount: 300, amountBolivares: 10950, date: new Date('2024-01-15'), category: 'Compra de materiales' },
    { description: 'Reparación de bomba de agua Línea 1', responsible: 'Admin', amount: 450, date: new Date('2024-02-05'), category: 'Mantenimiento de equipos' },
    { description: 'Pintura para oficina administrativa', responsible: 'Admin', amount: 1200, amountBolivares: 43800, date: new Date('2024-02-20'), category: 'Remodelaciones' },
    { description: 'Servicio de internet', responsible: 'Admin', amount: 100, date: new Date('2024-03-01'), category: 'Otros gastos' },
];
