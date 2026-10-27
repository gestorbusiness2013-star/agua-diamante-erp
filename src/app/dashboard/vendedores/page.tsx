'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventory } from '@/context/inventory-context';
import { useAuth } from '@/context/auth-context';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
    Calendar as CalendarIcon, 
    MapPinned, 
    LocateFixed, 
    TrendingUp, 
    DollarSign, 
    Users, 
    ShoppingBag, 
    Activity, 
    Medal, 
    ChevronRight,
    Crown,
    Package,
    ShieldAlert,
    CheckCircle2,
    Sparkles,
    Lock,
    Unlock,
    AlertTriangle,
    Clock,
    Award,
    UserPlus,
    Edit
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserForm } from "@/components/user-form";
import type { User, UserFormValues } from "@/lib/users-data";
import {
    computeSellerCredit,
    CREDIT_LEVELS,
    type SellerCreditStatus,
    type CreditLevel,
    countBoxes,
} from '@/lib/seller-credit';
import { getSaleItems, type Sale } from '@/lib/sales-data';
import dynamic from 'next/dynamic';

const SellerMap = dynamic(() => import('@/components/seller-map'), { 
    ssr: false,
    loading: () => <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center"><p>Cargando mapa interactivo...</p></div>
});

export default function VendedoresPage() {
    const { sales, users, updateUserLocation, updateSellerCredit, createUser, updateUser } = useInventory();
    const { currentUser } = useAuth();
    const { toast } = useToast();

    const [date, setDate] = useState<DateRange | undefined>();
    const [isClient, setIsClient] = useState(false);
    const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
    const [isUpdatingCredit, setIsUpdatingCredit] = useState(false);
    const [createSellerDialogOpen, setCreateSellerDialogOpen] = useState(false);
    const [sellerToEdit, setSellerToEdit] = useState<User | null>(null);

    useEffect(() => {
        setIsClient(true);
        const today = new Date();
        setDate({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(new Date(today.getFullYear(), today.getMonth() + 1, 0), 0) });
    }, []);

    const sellers = useMemo(() => (users || []).filter(u => u && (u.role === 'Vendedor' || (u.commissionRate && u.commissionRate > 0) || (u.name || '').toLowerCase().includes('robert'))), [users]);

    const sellerStats = useMemo(() => {
        if (!isClient) return []; 
        let filteredSales = sales || [];
        if (date?.from && date?.to) {
            filteredSales = (sales || []).filter(s => {
                if (!s || !s.date) return false;
                let dateVal: Date | null = null;
                if (s.date instanceof Date) {
                    dateVal = s.date;
                } else if (typeof (s.date as any).toDate === 'function') {
                    dateVal = (s.date as any).toDate();
                } else if (typeof (s.date as any).seconds === 'number') {
                    dateVal = new Date((s.date as any).seconds * 1000);
                } else {
                    dateVal = new Date(s.date);
                }
                return dateVal && !isNaN(dateVal.getTime()) && dateVal >= date.from! && dateVal <= date.to!;
            });
        }

        return sellers.map(seller => {
            const sSales = seller.name ? filteredSales.filter(s => s && (s.user || '').trim().toLowerCase() === (seller.name || '').trim().toLowerCase()) : [];
            
            let timestampMs: number | null = null;
            if (seller.lastLocationTimestamp) {
                const ts = seller.lastLocationTimestamp as any;
                if (ts instanceof Date) {
                    timestampMs = ts.getTime();
                } else if (typeof ts.toDate === 'function') {
                    timestampMs = ts.toDate().getTime();
                } else if (typeof ts.seconds === 'number') {
                    timestampMs = ts.seconds * 1000;
                } else if (typeof ts === 'string') {
                    timestampMs = new Date(ts).getTime();
                } else if (typeof ts === 'number') {
                    timestampMs = ts;
                }
            }
            const active = timestampMs !== null && (Date.now() - timestampMs) < (12 * 60 * 60 * 1000);

            const totalSold = sSales.reduce((sum, s) => sum + (Number(s?.totalAmount) || 0), 0);

            // ── Crédito gamificado (estilo Cashea) en vivo ──
            const credit: SellerCreditStatus = computeSellerCredit(seller, sales);

            // Órdenes en consignación activas (deuda en calle)
            const openConsignmentSales = (sales || []).filter(s =>
                s && s.saleType === 'Consignación' &&
                ['Pendiente', 'Despachado', 'Por Cobrar'].includes(s.status) &&
                (s.user || '').trim().toLowerCase() === (seller.name || '').trim().toLowerCase()
            );

            return {
                ...seller,
                credit,
                openConsignmentSales,
                totalSold,
                totalCommission: sSales.reduce((sum, s) => {
                    if (s?.saleType === 'Cortesía') return sum;
                    const isRobertOrSeller = ((seller.name || '').toLowerCase().includes('robert') || seller.role === 'Vendedor');
                    let rate = Number(s?.commissionRate) || Number(seller.commissionRate) || (isRobertOrSeller ? 10 : 0);
                    if (rate === 5 && isRobertOrSeller) {
                        rate = 10;
                    }
                    const comm = Number(s?.commissionAmount) || 0;
                    if (comm > 0 && rate !== 10) return sum + comm;
                    return sum + ((Number(s?.totalAmount) || 0) * (rate / 100));
                }, 0),
                saleCount: sSales.length,
                ticketPromedio: sSales.length > 0 ? totalSold / sSales.length : 0,
                recentSales: sSales.slice(0, 5),
                isActive: active
            };
        }).sort((a, b) => b.totalSold - a.totalSold);
    }, [sales, sellers, date, isClient]);

    const selectedSeller = useMemo(
        () => sellerStats.find(s => s.id === selectedSellerId) || null,
        [sellerStats, selectedSellerId]
    );

    const totals = useMemo(() => sellerStats.reduce((acc, s) => ({
        sold: acc.sold + s.totalSold,
        commissions: acc.commissions + s.totalCommission,
        sales: acc.sales + s.saleCount,
        debtBoxes: acc.debtBoxes + s.credit.currentCreditDebtBoxes,
        totalCapacityBoxes: acc.totalCapacityBoxes + s.credit.maxCreditBoxes,
        availableBoxes: acc.availableBoxes + s.credit.availableBoxes,
    }), { sold: 0, commissions: 0, sales: 0, debtBoxes: 0, totalCapacityBoxes: 0, availableBoxes: 0 }), [sellerStats]);

    const handleCheckIn = () => {
        if (!currentUser || !currentUser.id) return;
        if (!navigator.geolocation) {
            toast({ variant: "destructive", title: "Error", description: "Geolocalización no soportada." });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (p) => {
                updateUserLocation(currentUser.id, { lat: p.coords.latitude, lng: p.coords.longitude });
                toast({ title: "Check-in Exitoso", description: "Tu rastro ha sido actualizado en vivo." });
            },
            (e) => toast({ variant: "destructive", title: "Error de Ubicación", description: e.message }),
            { enableHighAccuracy: true }
        );
    };

    const handleToggleLock = async (sellerId: string, currentLockState: boolean) => {
        if (!updateSellerCredit) return;
        setIsUpdatingCredit(true);
        try {
            await updateSellerCredit(sellerId, { isLocked: !currentLockState });
        } finally {
            setIsUpdatingCredit(false);
        }
    };

    const handleChangeLevel = async (sellerId: string, newLevelStr: string) => {
        if (!updateSellerCredit) return;
        const newLevel = parseInt(newLevelStr, 10);
        if (isNaN(newLevel) || newLevel < 1 || newLevel > 4) return;
        setIsUpdatingCredit(true);
        try {
            await updateSellerCredit(sellerId, { creditLevel: newLevel });
        } finally {
            setIsUpdatingCredit(false);
        }
    };

    const handleAdjustOnTimeCount = async (sellerId: string, count: number) => {
        if (!updateSellerCredit) return;
        setIsUpdatingCredit(true);
        try {
            await updateSellerCredit(sellerId, { onTimePaymentsCount: count });
        } finally {
            setIsUpdatingCredit(false);
        }
    };
    
    const handleCreateSellerSubmit = async (values: UserFormValues) => {
        try {
            await createUser({
                ...values,
                role: 'Vendedor',
            });
            setCreateSellerDialogOpen(false);
            toast({ title: 'Vendedor Creado', description: `Se configuró el vendedor con Nivel ${values.creditLevel || 1}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error?.message || 'No se pudo crear el vendedor.' });
        }
    };

    const handleEditSellerSubmit = async (values: UserFormValues) => {
        if (!sellerToEdit) return;
        try {
            await updateUser({
                ...sellerToEdit,
                name: values.name,
                role: 'Vendedor',
                commissionRate: values.commissionRate,
                creditLevel: values.creditLevel || sellerToEdit.creditLevel || 1,
                permissions: values.permissions,
            });
            setSellerToEdit(null);
            toast({ title: 'Vendedor Actualizado', description: `Nivel y datos actualizados correctamente.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error?.message || 'No se pudo actualizar el vendedor.' });
        }
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="space-y-6">
            {/* ── Encabezado Principal ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        Panel de Vendedores
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                            <Activity className="h-3 w-3 mr-1" /> En Vivo
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground">Monitoriza las comisiones, el rastro GPS y el crédito gamificado estilo Cashea de tu equipo.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? format(date.from, "PP", { locale: es }) : 'Periodo'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="range" selected={date} onSelect={setDate} locale={es} />
                        </PopoverContent>
                    </Popover>
                    {currentUser?.role === 'Admin' && (
                        <Button onClick={() => setCreateSellerDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Crear Vendedor
                        </Button>
                    )}
                    {currentUser?.role === 'Vendedor' && (
                        <Button onClick={handleCheckIn} className="shadow-lg hover:scale-105 transition-transform">
                            <LocateFixed className="mr-2 h-4 w-4" /> Check-in
                        </Button>
                    )}
                </div>
            </div>

            {/* ── KPIs Generales ── */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2 text-sm font-medium">Ventas</CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totals.sold)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-sm font-medium">Comisiones</CardHeader>
                    <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.commissions)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-sm font-medium">Crédito en Calle</CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono">
                            {totals.debtBoxes} <span className="text-sm font-normal text-muted-foreground">cajas</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Cupo disponible global: <strong>{totals.availableBoxes} / {totals.totalCapacityBoxes}</strong> cajas
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-sm font-medium">Equipo</CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sellers.length} Vendedores</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{totals.sales} pedidos completados</p>
                    </CardContent>
                </Card>
            </div>

            {/* ════ SECCIÓN: CRÉDITO GAMIFICADO POR NIVELES (ESTILO CASHEA) ════ */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-500" />
                            Límites de Crédito Gamificado (Estilo Cashea)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Capacidad por nivel: 🥉 Nivel 1 (20 cx) • 🥈 Nivel 2 (40 cx) • 🥇 Nivel 3 (100 cx) • 💎 Nivel 4 (250 cx). Ascenso cada 3 pagos a tiempo.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-semibold border border-amber-300">
                            🥉 N1: 20 cx
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-semibold border border-slate-300">
                            🥈 N2: 40 cx
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 font-semibold border border-yellow-300">
                            🥇 N3: 100 cx
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200 font-semibold border border-cyan-300">
                            💎 N4: 250 cx
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sellerStats.map(s => {
                        const credit = s.credit;
                        const isBlocked = credit.isLocked;
                        const progressPercent = Math.min(100, Math.round((credit.availableBoxes / credit.maxCreditBoxes) * 100));
                        const nextLevelPercent = credit.level < 4 ? Math.round((credit.onTimePaymentsCount / credit.paymentsToNextLevel) * 100) : 100;

                        return (
                            <Card 
                                key={`credit-card-${s.id}`} 
                                className={cn(
                                    "relative overflow-hidden transition-all hover:shadow-md border",
                                    isBlocked ? "border-red-300 bg-red-50/20 dark:border-red-900/60 dark:bg-red-950/20" : "hover:border-primary/40"
                                )}
                            >
                                <div className={cn("h-1.5 w-full bg-gradient-to-r", credit.levelColor)} />
                                <CardHeader className="p-4 pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-10 w-10 border shadow-xs">
                                                <AvatarImage src={`https://placehold.co/100x100.png?text=${s.name?.[0] || 'U'}`} />
                                                <AvatarFallback>{s.name?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-semibold text-sm leading-tight">{s.name}</h4>
                                                <p className="text-[11px] text-muted-foreground">{s.email}</p>
                                            </div>
                                        </div>

                                        {/* Insignia Visual del Nivel Cashea */}
                                        <div className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs border shrink-0",
                                            credit.level === 1 && "bg-gradient-to-r from-amber-700 to-amber-600 text-white border-amber-800",
                                            credit.level === 2 && "bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900 border-slate-400",
                                            credit.level === 3 && "bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 border-yellow-600",
                                            credit.level === 4 && "bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 border-cyan-500 shadow-cyan-500/20 shadow-md"
                                        )}>
                                            <span>{credit.levelEmoji}</span>
                                            <span>Nivel {credit.level} · {credit.levelName}</span>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 space-y-3.5">
                                    {/* Estado de Bloqueo / Solvencia */}
                                    {isBlocked ? (
                                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium">
                                            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                                            <span>{credit.overdueSales ? `Bloqueado por mora (${credit.overdueSales} orden(es) vencida(s))` : 'Crédito bloqueado por mora'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Estado:
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Solvente / Al día</span>
                                        </div>
                                    )}

                                    {/* ── Barra de crédito dinámico: "Cajas Disponibles: X / Y cajas" ── */}
                                    <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5 border border-border/50">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-foreground flex items-center gap-1">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground" /> Cajas Disponibles:
                                            </span>
                                            <span className={cn("font-mono font-bold text-sm", isBlocked || credit.availableBoxes === 0 ? "text-red-600" : "text-emerald-600")}>
                                                {credit.availableBoxes} / {credit.maxCreditBoxes} cajas
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div 
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    isBlocked ? "bg-red-500" : progressPercent <= 25 ? "bg-amber-500" : "bg-emerald-500"
                                                )}
                                                style={{ width: `${isBlocked ? 0 : progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-muted-foreground">
                                            <span>Retiradas pendientes: <strong>{credit.currentCreditDebtBoxes} cajas</strong></span>
                                            <span>{isBlocked ? 'Cupo bloqueado' : `${progressPercent}% disponible`}</span>
                                        </div>
                                    </div>

                                    {/* ── Barra de progreso para subir al siguiente nivel (ej. "2/3 pagos a tiempo para Nivel 2") ── */}
                                    <div className="space-y-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[11px] font-medium flex items-center gap-1">
                                                <Sparkles className="h-3 w-3 text-amber-500" /> Progreso de Ascenso:
                                            </span>
                                            <span className="text-[11px] font-semibold">
                                                {credit.level < 4 && credit.nextLevel ? (
                                                    `${credit.onTimePaymentsCount}/${credit.paymentsToNextLevel} pagos a tiempo para Nivel ${credit.level + 1}`
                                                ) : (
                                                    '👑 Nivel Máximo Alcanzado'
                                                )}
                                            </span>
                                        </div>
                                        {credit.level < 4 ? (
                                            <>
                                                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${nextLevelPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                    <span>Faltan {Math.max(0, credit.paymentsToNextLevel - credit.onTimePaymentsCount)} pago(s) a tiempo</span>
                                                    <span>Meta Nivel {credit.level + 1}: {CREDIT_LEVELS[credit.nextLevel!].maxBoxes} cajas</span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground">Capacidad élite activa de 250 cajas sin restricciones.</p>
                                        )}
                                    </div>

                                    {/* Selector rápido para asignar o cambiar nivel (Admin) */}
                                    {currentUser?.role === 'Admin' && (
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Asignar Nivel:</span>
                                            <Select
                                                value={String(credit.level)}
                                                onValueChange={(val) => handleChangeLevel(s.id, val)}
                                                disabled={isUpdatingCredit}
                                            >
                                                <SelectTrigger className="h-7 text-xs flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">🥉 Nivel 1 · Bronce (20 cx)</SelectItem>
                                                    <SelectItem value="2">🥈 Nivel 2 · Plata (40 cx)</SelectItem>
                                                    <SelectItem value="3">🥇 Nivel 3 · Oro (100 cx)</SelectItem>
                                                    <SelectItem value="4">💎 Nivel 4 · Diamante (250 cx)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="p-3 pt-0 flex items-center justify-between gap-2 border-t bg-muted/20">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs flex-1 justify-between hover:bg-muted"
                                        onClick={() => setSelectedSellerId(s.id)}
                                    >
                                        <span>Detalles ({s.openConsignmentSales.length} órdenes)</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    {currentUser?.role === 'Admin' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs shrink-0"
                                            title="Editar Vendedor"
                                            onClick={() => setSellerToEdit(s)}
                                        >
                                            <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* ── Seguimiento en Mapa y Ranking de Rendimiento ── */}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPinned className="h-5 w-5 text-primary" /> Seguimiento y Rutas
                        </CardTitle>
                    </CardHeader>
                    <CardContent><SellerMap sellers={sellers} /></CardContent>
                    <CardFooter className="text-xs text-muted-foreground gap-4">
                        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-primary rounded-full" /> Líneas: Recorridos</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Marcadores: Último punto</div>
                    </CardFooter>
                </Card>

                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Ranking de Rendimiento 
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <Table>
                            <TableBody>
                                {sellerStats.map((s, index) => (
                                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSellerId(s.id)}>
                                        <TableCell className="w-10 text-center font-bold">
                                            {index === 0 && <Medal className="h-5 w-5 text-yellow-500 mx-auto" />}
                                            {index === 1 && <Medal className="h-5 w-5 text-slate-400 mx-auto" />}
                                            {index === 2 && <Medal className="h-5 w-5 text-amber-600 mx-auto" />}
                                            {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                                        </TableCell>
                                        <TableCell className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar className="h-8 w-8"><AvatarImage src={`https://placehold.co/100x100.png?text=${s.name?.[0] || 'U'}`} /><AvatarFallback>{s.name?.[0] || 'U'}</AvatarFallback></Avatar>
                                                {s.isActive && <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-background animate-pulse" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-medium">{s.name || 'Usuario'}</span>
                                                    <span className="text-xs">{s.credit.levelEmoji}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Cupo: {s.credit.availableBoxes}/{s.credit.maxCreditBoxes} cx
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-bold text-emerald-600">{formatCurrency(s.totalCommission)}</div>
                                            <div className="text-[10px] text-muted-foreground">{s.saleCount} ventas</div>
                                        </TableCell>
                                        <TableCell className="w-8 pl-0 text-right"><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ════ DRAWER / SHEET DE DETALLE Y GESTIÓN DE CRÉDITO DEL VENDEDOR ════ */}
            <Sheet open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSellerId(null)}>
                <SheetContent className="w-[420px] sm:w-[600px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border shadow-xs">
                                <AvatarImage src={`https://placehold.co/100x100.png?text=${selectedSeller?.name?.[0] || 'U'}`} />
                                <AvatarFallback>{selectedSeller?.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <SheetTitle className="text-2xl">{selectedSeller?.name}</SheetTitle>
                                    {selectedSeller && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-muted">
                                            {selectedSeller.credit.levelEmoji} Nivel {selectedSeller.credit.level}
                                        </span>
                                    )}
                                </div>
                                <SheetDescription className="flex items-center gap-2">
                                    {selectedSeller?.isActive ? (
                                        <><span className="flex h-2 w-2 rounded-full bg-green-500"></span> Activo recientemente</>
                                    ) : (
                                        <><span className="flex h-2 w-2 rounded-full bg-slate-300"></span> Inactivo</>
                                    )}
                                    <span>•</span>
                                    <span>{selectedSeller?.email}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    
                    {selectedSeller && (
                        <div className="space-y-6">
                            {/* Tarjeta de Crédito Cashea Detallada */}
                            <Card className={cn("border shadow-xs", selectedSeller.credit.isLocked ? "border-red-300 bg-red-50/20" : "border-primary/20 bg-primary/5")}>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-amber-500" />
                                            Crédito Gamificado Estilo Cashea
                                        </CardTitle>
                                        <div className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs",
                                            selectedSeller.credit.level === 1 && "bg-amber-700",
                                            selectedSeller.credit.level === 2 && "bg-slate-500",
                                            selectedSeller.credit.level === 3 && "bg-amber-500 text-slate-900",
                                            selectedSeller.credit.level === 4 && "bg-cyan-600"
                                        )}>
                                            {selectedSeller.credit.levelEmoji} Nivel {selectedSeller.credit.level} ({selectedSeller.credit.levelName})
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-1 space-y-3.5">
                                    {/* Barra de Cupo */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-foreground">Cajas Disponibles:</span>
                                            <span className={cn("font-mono font-bold text-sm", selectedSeller.credit.isLocked ? "text-red-600" : "text-emerald-600")}>
                                                {selectedSeller.credit.availableBoxes} / {selectedSeller.credit.maxCreditBoxes} cajas
                                            </span>
                                        </div>
                                        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div 
                                                className={cn("h-full rounded-full transition-all", selectedSeller.credit.isLocked ? "bg-red-500" : "bg-emerald-500")}
                                                style={{ width: `${selectedSeller.credit.isLocked ? 0 : Math.min(100, (selectedSeller.credit.availableBoxes / selectedSeller.credit.maxCreditBoxes) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-muted-foreground">
                                            <span>Retiradas pendientes: <strong>{selectedSeller.credit.currentCreditDebtBoxes} cajas</strong></span>
                                            <span>{selectedSeller.credit.isLocked ? 'Bloqueado' : `${selectedSeller.credit.availableBoxes} cajas libres`}</span>
                                        </div>
                                    </div>

                                    {/* Barra de progreso de nivel */}
                                    <div className="space-y-1.5 pt-2 border-t">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium flex items-center gap-1">
                                                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Ascenso de Nivel:
                                            </span>
                                            <span className="font-semibold">
                                                {selectedSeller.credit.level < 4 && selectedSeller.credit.nextLevel ? (
                                                    `${selectedSeller.credit.onTimePaymentsCount}/${selectedSeller.credit.paymentsToNextLevel} pagos a tiempo para Nivel ${selectedSeller.credit.level + 1} (${CREDIT_LEVELS[selectedSeller.credit.nextLevel].name})`
                                                ) : (
                                                    '👑 Nivel Diamante (250 cajas)'
                                                )}
                                            </span>
                                        </div>
                                        {selectedSeller.credit.level < 4 && (
                                            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full transition-all"
                                                    style={{ width: `${(selectedSeller.credit.onTimePaymentsCount / selectedSeller.credit.paymentsToNextLevel) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Panel de Administración de Crédito (solo rol Admin) */}
                                    {currentUser?.role === 'Admin' && (
                                        <div className="pt-3 border-t space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">Gestión de Crédito (Admin)</span>
                                                <Button
                                                    size="sm"
                                                    variant={selectedSeller.credit.isLocked ? "destructive" : "outline"}
                                                    disabled={isUpdatingCredit}
                                                    onClick={() => handleToggleLock(selectedSeller.id, selectedSeller.credit.isLocked)}
                                                    className="h-7 text-xs"
                                                >
                                                    {selectedSeller.credit.isLocked ? (
                                                        <><Unlock className="h-3 w-3 mr-1" /> Desbloquear</>
                                                    ) : (
                                                        <><Lock className="h-3 w-3 mr-1" /> Bloquear Crédito</>
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <label className="text-[11px] text-muted-foreground block mb-1">Nivel Manual:</label>
                                                    <Select
                                                        defaultValue={String(selectedSeller.credit.level)}
                                                        onValueChange={(val) => handleChangeLevel(selectedSeller.id, val)}
                                                        disabled={isUpdatingCredit}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">🥉 Nivel 1 (20 cajas)</SelectItem>
                                                            <SelectItem value="2">🥈 Nivel 2 (40 cajas)</SelectItem>
                                                            <SelectItem value="3">🥇 Nivel 3 (100 cajas)</SelectItem>
                                                            <SelectItem value="4">💎 Nivel 4 (250 cajas)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-muted-foreground block mb-1">Pagos a tiempo:</label>
                                                    <div className="flex items-center gap-1">
                                                        {[0, 1, 2, 3].map(cnt => (
                                                            <Button
                                                                key={cnt}
                                                                size="sm"
                                                                variant={selectedSeller.credit.onTimePaymentsCount === cnt ? "default" : "outline"}
                                                                className="h-8 flex-1 text-xs p-0"
                                                                disabled={isUpdatingCredit}
                                                                onClick={() => handleAdjustOnTimeCount(selectedSeller.id, cnt)}
                                                            >
                                                                {cnt}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Métricas de Rendimiento */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Vendido</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{formatCurrency(selectedSeller.totalSold)}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Comisiones</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedSeller.totalCommission)}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Órdenes Completadas</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{selectedSeller.saleCount}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Ticket Promedio</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedSeller.ticketPromedio)}</p></CardContent></Card>
                            </div>

                            {/* Órdenes a Consignación Activas (Retiros pendientes de cobro) */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Package className="h-4 w-4 text-sky-600" />
                                        Órdenes en Consignación / Crédito Activas
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {selectedSeller.openConsignmentSales.length} orden(es)
                                    </Badge>
                                </h4>
                                {selectedSeller.openConsignmentSales.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedSeller.openConsignmentSales.map((sale: Sale) => {
                                            const boxes = countBoxes(getSaleItems(sale));
                                            const due = sale.dueDate ? (sale.dueDate instanceof Date ? sale.dueDate : new Date((sale.dueDate as any)?.seconds ? (sale.dueDate as any).seconds * 1000 : sale.dueDate)) : null;
                                            const isOverdue = due && due.getTime() < Date.now();

                                            return (
                                                <div 
                                                    key={sale.id} 
                                                    className={cn(
                                                        "p-3 rounded-lg border text-xs flex justify-between items-center",
                                                        isOverdue ? "border-red-300 bg-red-50/40 dark:bg-red-950/20" : "bg-card"
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                                                            {sale.customerName}
                                                            {isOverdue && <span className="text-[10px] text-red-600 font-bold uppercase">(Vencida)</span>}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {sale.invoiceNumber} • <strong>{boxes} cajas</strong> • Vence: {due ? format(due, "dd/MM/yyyy") : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm">{formatCurrency(sale.totalAmount)}</p>
                                                        <Badge variant={isOverdue ? "destructive" : "outline"} className="text-[10px] h-5">
                                                            {sale.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground p-3 rounded-lg border border-dashed text-center">
                                        Sin deudas pendientes en consignación. Todo el cupo disponible.
                                    </p>
                                )}
                            </div>

                            {/* Últimas 5 Órdenes Generales */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3">Últimas 5 Órdenes de Venta</h4>
                                {selectedSeller.recentSales.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {selectedSeller.recentSales.map((sale: any) => (
                                            <div key={sale.id} className="flex justify-between items-center p-3 rounded-lg border">
                                                <div>
                                                    <p className="font-medium text-sm">{sale.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {sale.invoiceNumber} • {sale.date && !isNaN(new Date(sale.date).getTime()) ? format(new Date(sale.date), "dd/MM/yyyy") : 'Fecha N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">{formatCurrency(sale.totalAmount)}</p>
                                                    <Badge variant="outline" className={cn("text-[10px] h-5", sale.status === 'Cancelado' ? 'text-red-500' : 'text-green-600')}>{sale.status}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hay órdenes registradas.</p>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Dialog Crear Vendedor ── */}
            <Dialog open={createSellerDialogOpen} onOpenChange={setCreateSellerDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Vendedor</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo vendedor y asígnale su Nivel de Crédito Cashea inicial (1 al 4).
                        </DialogDescription>
                    </DialogHeader>
                    <UserForm
                        isEditMode={false}
                        initialData={{
                            id: '',
                            name: '',
                            email: '',
                            role: 'Vendedor',
                            commissionRate: 10,
                            creditLevel: 1,
                        } as any}
                        onSubmit={handleCreateSellerSubmit}
                        onClose={() => setCreateSellerDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* ── Dialog Editar Vendedor ── */}
            <Dialog open={!!sellerToEdit} onOpenChange={(open) => !open && setSellerToEdit(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Vendedor</DialogTitle>
                        <DialogDescription>
                            Actualiza los datos del vendedor o cambia su Nivel de Crédito Cashea.
                        </DialogDescription>
                    </DialogHeader>
                    {sellerToEdit && (
                        <UserForm
                            isEditMode={true}
                            initialData={sellerToEdit}
                            onSubmit={handleEditSellerSubmit}
                            onClose={() => setSellerToEdit(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
