import type { Sale } from '@/lib/sales-data';
import { getSaleItems } from '@/lib/sales-data';
import type { User } from '@/lib/users-data';

/**
 * Sistema de crédito gamificado por niveles (estilo Cashea) para vendedores.
 * El cupo se mide en cajas (unidades de producto retiradas a crédito/consignación).
 */
export type CreditLevel = 1 | 2 | 3 | 4;

export const CREDIT_LEVELS: Record<CreditLevel, { name: string; maxBoxes: number; color: string; emoji: string }> = {
    1: { name: 'Bronce', maxBoxes: 20, color: 'from-amber-700 to-amber-500', emoji: '🥉' },
    2: { name: 'Plata', maxBoxes: 40, color: 'from-slate-400 to-slate-200', emoji: '🥈' },
    3: { name: 'Oro', maxBoxes: 100, color: 'from-yellow-500 to-yellow-300', emoji: '🥇' },
    4: { name: 'Diamante', maxBoxes: 250, color: 'from-cyan-500 to-sky-300', emoji: '💎' },
};

/** Pagos a tiempo necesarios para ascender al siguiente nivel. */
export const PAYMENTS_TO_LEVEL_UP = 3;

/** Estados en los que una venta a consignación sigue ocupando cupo. */
const DEBT_STATUSES: Sale['status'][] = ['Pendiente', 'Despachado', 'Por Cobrar'];

export const normalizeLevel = (level?: number | null): CreditLevel => {
    const n = Math.round(Number(level) || 1);
    return (Math.min(4, Math.max(1, n)) as CreditLevel);
};

export const getMaxCreditBoxes = (level?: number | null) => CREDIT_LEVELS[normalizeLevel(level)].maxBoxes;

const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const sameSeller = (sale: Sale, sellerName: string) =>
    (sale.user || '').trim().toLowerCase() === (sellerName || '').trim().toLowerCase();

export const isCreditSale = (sale: Pick<Sale, 'saleType'>) => sale.saleType === 'Consignación';

export const countBoxes = (items: { quantity: number }[]) =>
    items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

export type SellerCreditStatus = {
    level: CreditLevel;
    levelName: string;
    levelEmoji: string;
    levelColor: string;
    maxCreditBoxes: number;
    currentCreditDebtBoxes: number;
    availableBoxes: number;
    onTimePaymentsCount: number;
    paymentsToNextLevel: number;
    nextLevel: CreditLevel | null;
    isLocked: boolean;
    overdueSales: number;
};

/**
 * Calcula el estado de crédito del vendedor.
 * La deuda en cajas y la mora se derivan en vivo de las ventas a consignación
 * (así nunca se desincronizan), mientras que el nivel y el contador de pagos
 * a tiempo se persisten en el perfil del usuario.
 */
export function computeSellerCredit(user: Pick<User, 'name'> & Partial<User>, sales: Sale[], excludeSaleId?: string): SellerCreditStatus {
    const level = normalizeLevel(user.creditLevel);
    const cfg = CREDIT_LEVELS[level];
    const now = Date.now();

    const openCreditSales = (sales || []).filter(s =>
        s && isCreditSale(s) && DEBT_STATUSES.includes(s.status) && sameSeller(s, user.name) && s.id !== excludeSaleId
    );

    const currentCreditDebtBoxes = openCreditSales.reduce((sum, s) => sum + countBoxes(getSaleItems(s)), 0);

    const overdueSales = openCreditSales.filter(s => {
        if (s.status === 'Pendiente') return false;
        const due = toDate(s.dueDate);
        return !!due && due.getTime() < now;
    }).length;

    const isLocked = Boolean(user.isLocked) || overdueSales > 0;
    const onTimePaymentsCount = Math.max(0, Number(user.onTimePaymentsCount) || 0);
    const nextLevel = level < 4 ? ((level + 1) as CreditLevel) : null;

    return {
        level,
        levelName: cfg.name,
        levelEmoji: cfg.emoji,
        levelColor: cfg.color,
        maxCreditBoxes: cfg.maxBoxes,
        currentCreditDebtBoxes,
        availableBoxes: isLocked ? 0 : Math.max(0, cfg.maxBoxes - currentCreditDebtBoxes),
        onTimePaymentsCount,
        paymentsToNextLevel: PAYMENTS_TO_LEVEL_UP,
        nextLevel,
        isLocked,
        overdueSales,
    };
}

/** Determina si un pago se realizó a tiempo (antes o en la fecha de vencimiento). */
export function isPaidOnTime(sale: Sale, paidAt: Date = new Date()) {
    const due = toDate(sale.dueDate);
    if (!due) return true;
    const endOfDueDay = new Date(due);
    endOfDueDay.setHours(23, 59, 59, 999);
    return paidAt.getTime() <= endOfDueDay.getTime();
}

/** Calcula el nuevo nivel y contador tras un pago a tiempo. */
export function applyOnTimePayment(level?: number | null, count?: number | null) {
    let newLevel = normalizeLevel(level);
    let newCount = (Number(count) || 0) + 1;
    let leveledUp = false;
    if (newLevel < 4 && newCount >= PAYMENTS_TO_LEVEL_UP) {
        newLevel = (newLevel + 1) as CreditLevel;
        newCount = 0;
        leveledUp = true;
    }
    if (newLevel === 4) newCount = Math.min(newCount, PAYMENTS_TO_LEVEL_UP);
    return { creditLevel: newLevel, onTimePaymentsCount: newCount, maxCreditBoxes: getMaxCreditBoxes(newLevel), leveledUp };
}
