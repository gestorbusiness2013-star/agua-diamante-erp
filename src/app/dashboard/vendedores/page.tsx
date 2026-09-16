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
import { Calendar as CalendarIcon, MapPinned, LocateFixed, TrendingUp, DollarSign, Users, ShoppingBag, Activity, Medal, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import dynamic from 'next/dynamic';

const SellerMap = dynamic(() => import('@/components/seller-map'), { 
    ssr: false,
    loading: () => <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center"><p>Cargando mapa interactivo...</p></div>
});

export default function VendedoresPage() {
    const { sales, users, updateUserLocation } = useInventory();
    const { currentUser } = useAuth();
    const { toast } = useToast();

    const [date, setDate] = useState<DateRange | undefined>();
    const [isClient, setIsClient] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<any>(null);

    useEffect(() => {
        setIsClient(true);
        const today = new Date();
        setDate({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(new Date(today.getFullYear(), today.getMonth() + 1, 0), 0) });
    }, []);

    const sellers = useMemo(() => (users || []).filter(u => u && u.role === 'Vendedor'), [users]);

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
            const sSales = seller.name ? filteredSales.filter(s => s && s.user === seller.name) : [];
            
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
            return {
                ...seller,
                totalSold,
                totalCommission: sSales.reduce((sum, s) => sum + (Number(s?.commissionAmount) || 0), 0),
                saleCount: sSales.length,
                ticketPromedio: sSales.length > 0 ? totalSold / sSales.length : 0,
                recentSales: sSales.slice(0, 5),
                isActive: active
            };
        }).sort((a, b) => b.totalSold - a.totalSold);
    }, [sales, sellers, date, isClient]);

    const totals = useMemo(() => sellerStats.reduce((acc, s) => ({
        sold: acc.sold + s.totalSold,
        commissions: acc.commissions + s.totalCommission,
        sales: acc.sales + s.saleCount
    }), { sold: 0, commissions: 0, sales: 0 }), [sellerStats]);

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
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        Panel de Vendedores
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                            <Activity className="h-3 w-3 mr-1" /> En Vivo
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground">Monitoriza las comisiones y el rastro de tu equipo.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{date?.from ? format(date.from, "PP", { locale: es }) : 'Periodo'}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end"><Calendar mode="range" selected={date} onSelect={setDate} locale={es} /></PopoverContent>
                    </Popover>
                    {currentUser?.role === 'Vendedor' && (
                        <Button onClick={handleCheckIn} className="shadow-lg hover:scale-105 transition-transform"><LocateFixed className="mr-2 h-4 w-4" />Check-in</Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2 text-sm font-medium">Ventas</CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals.sold)}</div></CardContent></Card>
                <Card><CardHeader className="pb-2 text-sm font-medium">Comisiones</CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.commissions)}</div></CardContent></Card>
                <Card><CardHeader className="pb-2 text-sm font-medium">Pedidos</CardHeader><CardContent><div className="text-2xl font-bold">{totals.sales}</div></CardContent></Card>
                <Card><CardHeader className="pb-2 text-sm font-medium">Equipo</CardHeader><CardContent><div className="text-2xl font-bold">{sellers.length} Vendedores</div></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><MapPinned /> Seguimiento y Rutas</CardTitle></CardHeader>
                    <CardContent><SellerMap sellers={sellers} /></CardContent>
                    <CardFooter className="text-xs text-muted-foreground gap-4"><div className="flex items-center gap-1"><div className="w-3 h-1 bg-primary rounded-full" /> Líneas: Recorridos</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Marcadores: Último punto</div></CardFooter>
                </Card>
                <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center justify-between">Ranking de Rendimiento <TrendingUp className="h-4 w-4 text-muted-foreground" /></CardTitle></CardHeader>
                    <CardContent className="p-0 flex-1">
                        <Table>
                            <TableBody>
                                {sellerStats.map((s, index) => (
                                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSeller(s)}>
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
                                                <span className="text-sm font-medium">{s.name || 'Usuario'}</span>
                                                <span className="text-[10px] text-muted-foreground">Venta prom: {formatCurrency(s.ticketPromedio)}</span>
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

            <Sheet open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSeller(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16"><AvatarImage src={`https://placehold.co/100x100.png?text=${selectedSeller?.name?.[0] || 'U'}`} /><AvatarFallback>{selectedSeller?.name?.[0] || 'U'}</AvatarFallback></Avatar>
                            <div>
                                <SheetTitle className="text-2xl">{selectedSeller?.name}</SheetTitle>
                                <SheetDescription className="flex items-center gap-2">
                                    {selectedSeller?.isActive ? (
                                        <><span className="flex h-2 w-2 rounded-full bg-green-500"></span> Activo recientemente</>
                                    ) : (
                                        <><span className="flex h-2 w-2 rounded-full bg-slate-300"></span> Inactivo</>
                                    )}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    
                    {selectedSeller && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Vendido</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{formatCurrency(selectedSeller.totalSold)}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Comisiones</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedSeller.totalCommission)}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Órdenes Completadas</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{selectedSeller.saleCount}</p></CardContent></Card>
                                <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Ticket Promedio</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedSeller.ticketPromedio)}</p></CardContent></Card>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-3">Últimas 5 Órdenes</h4>
                                {selectedSeller.recentSales.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedSeller.recentSales.map((sale: any) => (
                                            <div key={sale.id} className="flex justify-between items-center p-3 rounded-lg border">
                                                <div>
                                                    <p className="font-medium text-sm">{sale.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">{sale.invoiceNumber} • {format(new Date(sale.date), "dd/MM/yyyy")}</p>
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
        </div>
    );
}
