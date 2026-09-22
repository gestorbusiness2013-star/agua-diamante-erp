'use client';

import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, PlusCircle, PackageCheck, AlertTriangle, DollarSign, Calendar as CalendarIcon, TrendingUp, Search, ShoppingCart, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaleForm, type SaleFormValues } from "@/components/sale-form";
import type { Sale } from "@/lib/sales-data";
import { getSaleItems } from "@/lib/sales-data";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function SalesPage() {
    const { 
        sales, 
        warehouses, 
        updateSale, 
        customers,
        createSaleOrder,
        dispatchSaleOrder,
        cancelSaleOrder,
        collectConsignmentPayment,
    } = useInventory();

    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; type: 'dispatch' | 'cancel' | 'collect'; sale: Sale | null }>({ open: false, type: 'dispatch', sale: null });
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [date, setDate] = useState<DateRange | undefined>();
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setIsClient(true);
        const today = new Date();
        setDate({
            from: new Date(today.getFullYear(), today.getMonth(), 1),
            to: addDays(new Date(today.getFullYear(), today.getMonth() + 1, 0), 0),
        });
    }, []);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const filteredSales = useMemo(() => {
        if (!sales) return [];
        let filtered = [...sales];

        if (date?.from && date?.to) {
            const fromDate = new Date(date.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(date.to);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= fromDate && saleDate <= toDate;
            });
        }
        
        if (currentUser?.role && !(currentUser.role === 'Admin' || currentUser.role === 'Supervisor' || currentUser.role === 'Gerente de Planta')) {
            filtered = filtered.filter(s => s.user === currentUser.name);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s => {
                const matchCustomer = (s.customerName?.toLowerCase() || "").includes(query);
                const matchInvoice = (s.invoiceNumber?.toLowerCase() || "").includes(query);
                const items = getSaleItems(s);
                const matchProduct = items.some(i => i.productName.toLowerCase().includes(query));
                return matchCustomer || matchInvoice || matchProduct;
            });
        }

        return filtered.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });
    }, [sales, currentUser, date, searchQuery]);
    
    const chartData = useMemo(() => {
        const grouped = filteredSales.reduce((acc: any, sale) => {
            if (!sale.date) return acc;
            try {
                const d = new Date(sale.date);
                if (isNaN(d.getTime())) return acc;
                const dateStr = format(d, 'dd/MM');
                if (!acc[dateStr]) acc[dateStr] = { date: dateStr, ventas: 0 };
                acc[dateStr].ventas += (Number(sale.totalAmount) || 0);
            } catch (e) {
                // ignore invalid dates
            }
            return acc;
        }, {});
        
        // Convert to array and sort chronologically based on the object keys or just keep as sorted by the date object.
        // The dates are coming in sorted order from filteredSales usually, but we should sort just in case.
        return Object.values(grouped).sort((a: any, b: any) => {
            // This is a naive sort, assumes same year/month structure for short ranges.
            return a.date.localeCompare(b.date);
        });
    }, [filteredSales]);
    
    const pendingSales = useMemo(() => filteredSales.filter(s => s.status === 'Pendiente'), [filteredSales]);
    const dispatchedSales = useMemo(() => filteredSales.filter(s => s.status === 'Despachado' || s.status === 'Pagado'), [filteredSales]);
    const consignmentSales = useMemo(() => filteredSales.filter(s => s.status === 'Por Cobrar'), [filteredSales]);
    const cancelledSales = useMemo(() => filteredSales.filter(s => s.status === 'Cancelado'), [filteredSales]);
    
    const calculateTotals = (salesData: Sale[]) => {
        return salesData.reduce((acc, sale) => {
            acc.totalAmount += (Number(sale.totalAmount) || 0);
            acc.totalCommission += (Number(sale.commissionAmount) || 0);
            return acc;
        }, { totalAmount: 0, totalCommission: 0 });
    };

    const handleOpenCreateDialog = () => {
        setSelectedSale(null);
        setSaleDialogOpen(true);
    };

    const handleOpenEditDialog = (sale: Sale) => {
        setSelectedSale(sale);
        setSaleDialogOpen(true);
    };

    const handleCloseDialogs = () => {
        setSaleDialogOpen(false);
        setAlertDialog({ open: false, type: 'dispatch', sale: null });
        setSelectedSale(null);
    };

    const handleSaleFormSubmit = async (values: SaleFormValues) => {
        if (!currentUser) return;
        if (selectedSale) {
            const saleItems = values.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice,
            }));
            const totalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
            const updatedSaleData: Sale = { ...selectedSale, ...values, items: saleItems, totalAmount };
            await updateSale(updatedSaleData);
        } else {
            await createSaleOrder(values, currentUser);
        }
        handleCloseDialogs();
    };
    
    const generateSaleDocumentPDF = async (sale: Sale) => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
    
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const halfPage = pageHeight / 2;
    
        const drawContent = (yOffset: number, isCopy: boolean) => {
            const docTitle = sale.documentType === 'Factura' ? 'Factura' : 'Nota de Entrega';
            const saleDate = format(new Date(sale.date), 'dd/MM/yyyy', { locale: es });
    
            doc.setFontSize(20);
            doc.text(docTitle, margin, yOffset + 8);
            doc.setFontSize(11);
            doc.text(`Nº: ${sale.invoiceNumber}`, pageWidth - margin, yOffset + 8, { align: 'right' });
            doc.text(`Fecha: ${saleDate}`, pageWidth - margin, yOffset + 16, { align: 'right' });
            
            doc.text(`Cliente: ${sale.customerName}`, margin, yOffset + 24);
            const customer = customers.find(c => String(c.id) === sale.customerId);
            if (customer) {
                doc.text(`RIF/C.I.: ${customer.rif}`, margin, yOffset + 30);
            }
    
            (doc as any).autoTable({
                startY: yOffset + 40,
                head: [['Producto', 'Cantidad', 'Precio Unit.', 'Total']],
                body: getSaleItems(sale).map(item => [
                    item.productName, 
                    item.quantity.toLocaleString('es-ES'), 
                    formatCurrency(item.unitPrice), 
                    formatCurrency(item.subtotal)
                ]),
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0]
                },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                },
                foot: [['', '', 'TOTAL:', formatCurrency(sale.totalAmount)]],
                footStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                },
            });
    
            const finalY = (doc as any).lastAutoTable.finalY || (yOffset + 60);
    
            if (sale.description) {
                doc.setFontSize(9);
                doc.text("Notas:", margin, finalY + 10);
                doc.text(sale.description, margin, finalY + 14, { maxWidth: pageWidth - (margin * 2) });
            }
            
            doc.setFontSize(10);
            doc.text("Firma de Recepción: ________________________", pageWidth - margin, finalY + 25, { align: 'right' });

            if (isCopy) {
                doc.saveGraphicsState();
                doc.setFontSize(100);
                doc.setTextColor(150);
                (doc as any).setGState(new (doc as any).GState({ opacity: 0.2 }));
                doc.text("COPIA", pageWidth / 2, yOffset + (halfPage / 2), {
                    align: 'center',
                    angle: 45,
                    baseline: 'middle'
                });
                doc.restoreGraphicsState();
            }
        };
    
        drawContent(margin, false); 
        (doc as any).setLineDash([2, 2], 0);
        doc.line(margin, halfPage, pageWidth - margin, halfPage);
        (doc as any).setLineDash([], 0);
        drawContent(halfPage + margin, true); 
        
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        toast({ title: "Documento Generado", description: `Se generó la ${sale.documentType}.` });
    };

    const handleDispatch = async () => {
        if (alertDialog.sale && currentUser) {
            const dispatchedSale = await dispatchSaleOrder(alertDialog.sale, currentUser);
            if (dispatchedSale) {
                await generateSaleDocumentPDF(dispatchedSale);
            }
        }
        handleCloseDialogs();
    };

    const handleCollectPayment = async () => {
        if (alertDialog.sale && currentUser) {
            await collectConsignmentPayment(alertDialog.sale, currentUser);
        }
        handleCloseDialogs();
    };
    
    const handleCancel = async () => {
        if (alertDialog.sale && currentUser) {
            await cancelSaleOrder(alertDialog.sale, currentUser);
        }
        handleCloseDialogs();
    };

    const getStatusBadge = (status: Sale['status']) => {
        const baseClasses = "capitalize";
        switch (status) {
            case 'Pendiente': return cn(baseClasses, "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100");
            case 'Despachado': return cn(baseClasses, "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100");
            case 'Por Cobrar': return cn(baseClasses, "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100");
            case 'Pagado': return cn(baseClasses, "bg-green-100 text-green-800 border-green-200 hover:bg-green-100");
            case 'Cancelado': return "destructive";
        }
    };
    
    const canDispatch = currentUser?.role === 'Admin' || currentUser?.role === 'Supervisor';

    const renderSalesTable = (salesData: Sale[], tableTitle: string) => (
         <Card>
            <CardContent className="pt-6">
                <TooltipProvider>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Orden</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="hidden md:table-cell">Producto</TableHead>
                                <TableHead className="hidden sm:table-cell text-right">Total</TableHead>
                                <TableHead className="hidden lg:table-cell text-right">Comisión</TableHead>
                                <TableHead className="hidden md:table-cell">Estado</TableHead>
                                <TableHead>Creado por</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">No hay órdenes en esta categoría para el período seleccionado.</TableCell>
                                </TableRow>
                            ) : (
                                salesData.map((sale) => (
                                    <TableRow key={sale.id} className={cn(sale.status === 'Cancelado' && "opacity-50 grayscale")}>
                                        <TableCell>
                                            <div className="font-medium">{sale.invoiceNumber}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {isClient ? format(new Date(sale.date), "dd/MM/yyyy", { locale: es }) : ''}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{sale.customerName}</div>
                                            {sale.description && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild><p className="text-xs text-muted-foreground italic pt-1 truncate max-w-xs">"{sale.description}"</p></TooltipTrigger>
                                                    <TooltipContent><p>{sale.description}</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {(() => {
                                                const items = getSaleItems(sale);
                                                if (items.length === 1) return items[0].productName;
                                                return (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help underline decoration-dotted">{items.length} productos</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <ul className="text-xs space-y-1">
                                                                {items.map((item, idx) => (
                                                                    <li key={idx}>{item.productName} × {item.quantity}</li>
                                                                ))}
                                                            </ul>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-right font-mono">{formatCurrency(sale.totalAmount)}</TableCell>
                                        <TableCell className="hidden lg:table-cell text-right font-mono text-emerald-500">
                                            {sale.commissionAmount ? formatCurrency(sale.commissionAmount) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant={getStatusBadge(sale.status) === 'destructive' ? 'destructive' : 'secondary'} className={getStatusBadge(sale.status)}>
                                                {sale.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{sale.user}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    {sale.status === 'Pendiente' && canDispatch && <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'dispatch', sale })}><PackageCheck className="mr-2 h-4 w-4"/>Despachar</DropdownMenuItem>}
                                                    {sale.status === 'Por Cobrar' && <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'collect', sale })}><DollarSign className="mr-2 h-4 w-4"/>Registrar Pago</DropdownMenuItem>}
                                                    {sale.status === 'Pendiente' && <DropdownMenuItem onClick={() => handleOpenEditDialog(sale)}>Editar</DropdownMenuItem>}
                                                    {sale.status !== 'Cancelado' && <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'cancel', sale })} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><AlertTriangle className="mr-2 h-4 w-4"/>Anular Orden</DropdownMenuItem>}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TooltipProvider>
            </CardContent>
            <CardFooter className="flex justify-end gap-6 border-t pt-4 text-right font-semibold">
                <div>
                    <p className="text-sm font-normal text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-500" /> Total Comisión</p>
                    <p className="text-xl">{formatCurrency(calculateTotals(salesData).totalCommission)}</p>
                </div>
                <div>
                    <p className="text-sm font-normal text-muted-foreground">Total en {tableTitle}</p>
                    <p className="text-xl">{formatCurrency(calculateTotals(salesData).totalAmount)}</p>
                </div>
            </CardFooter>
        </Card>
    );

    const totalFilteredSalesAmount = calculateTotals(filteredSales).totalAmount;
    const totalFilteredCommissions = calculateTotals(filteredSales).totalCommission;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        Órdenes de Venta
                    </h2>
                    <p className="text-muted-foreground">Analiza el rendimiento y gestiona las órdenes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (date.to ? (<>{format(date.from, "PPP", { locale: es })} - {format(date.to, "PPP", { locale: es })}</>) : (format(date.from, "PPP", { locale: es }))) : (<span>Seleccione un rango</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleOpenCreateDialog}><PlusCircle className="mr-2 h-4 w-4"/>Crear Orden</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalFilteredSalesAmount)}</div>
                        <p className="text-xs text-muted-foreground">{filteredSales.length} órdenes en total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones Generadas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFilteredCommissions)}</div>
                        <p className="text-xs text-muted-foreground">Rendimiento del equipo</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingSales.length}</div>
                        <p className="text-xs text-muted-foreground">Requieren despacho</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                        <DollarSign className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{consignmentSales.length}</div>
                        <p className="text-xs text-muted-foreground">Consignaciones activas</p>
                    </CardContent>
                </Card>
            </div>

            {chartData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia de Ventas</CardTitle>
                        <CardDescription>Volumen de ventas en el período seleccionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} dy={10} />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tickFormatter={(value) => `$${value}`}
                                        tick={{ fontSize: 12, fill: '#888888' }}
                                    />
                                    <RechartsTooltip 
                                        formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por cliente, factura o producto..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="pending">Pendientes</TabsTrigger>
                    <TabsTrigger value="consignment">Por Cobrar</TabsTrigger>
                    <TabsTrigger value="dispatched">Despachadas/Pagas</TabsTrigger>
                    <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">{renderSalesTable(pendingSales, 'Pendientes')}</TabsContent>
                <TabsContent value="consignment" className="mt-4">{renderSalesTable(consignmentSales, 'Por Cobrar')}</TabsContent>
                <TabsContent value="dispatched" className="mt-4">{renderSalesTable(dispatchedSales, 'Despachadas')}</TabsContent>
                <TabsContent value="cancelled" className="mt-4">{renderSalesTable(cancelledSales, 'Canceladas')}</TabsContent>
            </Tabs>

            <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedSale ? 'Editar Orden de Venta' : 'Crear Nueva Orden de Venta'}</DialogTitle>
                        <DialogDescription>
                           {selectedSale ? 'Actualiza los detalles de la orden.' : 'Completa los detalles para la nueva orden.'}
                        </DialogDescription>
                    </DialogHeader>
                    <SaleForm
                        initialData={selectedSale}
                        warehouses={warehouses}
                        customers={customers}
                        onSubmit={handleSaleFormSubmit}
                        onClose={handleCloseDialogs}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={alertDialog.open} onOpenChange={() => setAlertDialog({ ...alertDialog, open: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                           {alertDialog.type === 'dispatch' && 'Esta acción despachará la orden, descontará el stock del almacén y generará el documento de venta.'}
                           {alertDialog.type === 'cancel' && `Esta acción anulará la orden ${alertDialog.sale?.invoiceNumber}, restaurará el stock si fue despachada y registrará el evento de forma inalterable.`}
                           {alertDialog.type === 'collect' && `Esto marcará la orden ${alertDialog.sale?.invoiceNumber} como Pagada.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseDialogs}>No, volver</AlertDialogCancel>
                        <AlertDialogAction onClick={alertDialog.type === 'dispatch' ? handleDispatch : alertDialog.type === 'collect' ? handleCollectPayment : handleCancel}>
                           {alertDialog.type === 'dispatch' && 'Sí, Despachar'}
                           {alertDialog.type === 'collect' && 'Sí, Registrar Pago'}
                           {alertDialog.type === 'cancel' && 'Sí, Anular'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
