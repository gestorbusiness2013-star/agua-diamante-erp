'use client';

import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addDays, subDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, PlusCircle, PackageCheck, AlertTriangle, DollarSign, Calendar as CalendarIcon, TrendingUp, Search, ShoppingCart, Activity, ShieldAlert, KeyRound, Lock, Loader2, FileText, Eye } from "lucide-react";
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
import { CollectPaymentDialog } from "@/components/collect-payment-dialog";
import type { Sale } from "@/lib/sales-data";
import { getSaleItems } from "@/lib/sales-data";
import { useAuth } from "@/context/auth-context";
import { computeSellerCredit, CREDIT_LEVELS } from "@/lib/seller-credit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialUsers } from "@/lib/users-data";
import { verifyAdminCredentials } from "@/lib/auth-helpers";

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
        users,
    } = useInventory();

    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; type: 'dispatch' | 'cancel'; sale: Sale | null }>({ open: false, type: 'dispatch', sale: null });
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [collectPaymentDialogOpen, setCollectPaymentDialogOpen] = useState(false);
    const [saleToCollect, setSaleToCollect] = useState<Sale | null>(null);
    const [date, setDate] = useState<DateRange | undefined>();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'pending' | 'receivable' | 'dispatched' | 'cancelled'>('pending');
    const [quickReceivablesDialogOpen, setQuickReceivablesDialogOpen] = useState(false);
    const tableSectionRef = useRef<HTMLDivElement>(null);

    const handleCardClick = (tab: 'pending' | 'receivable' | 'dispatched' | 'cancelled') => {
        setActiveTab(tab);
        setTimeout(() => {
            tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };
    const [dispatchedDate, setDispatchedDate] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return {
            from: startOfMonth(today),
            to: endOfMonth(today),
        };
    });

    const sellerCreditStatus = useMemo(() => {
        if (!currentUser || currentUser.role !== 'Vendedor') return null;
        const sellerProfile = (users || []).find(u => u.id === currentUser.id) || currentUser;
        return computeSellerCredit(sellerProfile, sales, selectedSale?.id);
    }, [currentUser, users, sales, selectedSale]);

    const isQuickActive = (type: 'today' | '7days' | 'month' | 'all') => {
        if (type === 'all') return !dispatchedDate;
        if (!dispatchedDate || !dispatchedDate.from) return false;
        const today = new Date();
        if (type === 'today') {
            return isSameDay(dispatchedDate.from, today) && (!dispatchedDate.to || isSameDay(dispatchedDate.to, today));
        }
        if (type === 'month') {
            return isSameDay(dispatchedDate.from, startOfMonth(today)) && 
                   (dispatchedDate.to ? isSameDay(dispatchedDate.to, endOfMonth(today)) : true);
        }
        if (type === '7days') {
            return isSameDay(dispatchedDate.from, subDays(today, 7)) && 
                   (dispatchedDate.to ? isSameDay(dispatchedDate.to, today) : true);
        }
        return false;
    };

    const setQuickRange = (range: 'today' | '7days' | 'month' | 'all') => {
        const today = new Date();
        if (range === 'today') {
            setDispatchedDate({ from: today, to: today });
        } else if (range === '7days') {
            setDispatchedDate({ from: subDays(today, 7), to: today });
        } else if (range === 'month') {
            setDispatchedDate({ from: startOfMonth(today), to: endOfMonth(today) });
        } else if (range === 'all') {
            setDispatchedDate(undefined);
        }
    };

    // Estado para la autorización de anulación por parte del Administrador
    const [adminAuthDialogOpen, setAdminAuthDialogOpen] = useState(false);
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
    const [selectedAdminEmail, setSelectedAdminEmail] = useState("");
    const [adminKey, setAdminKey] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

    const adminUsers = useMemo(() => {
        const dbAdmins = (users || []).filter(u => u.role === 'Admin' || u.role === 'Administración');
        if (dbAdmins.length > 0) return dbAdmins;
        return initialUsers.filter(u => u.role === 'Admin' || u.role === 'Administración');
    }, [users]);

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
        
        const isCompanyWideViewer = currentUser?.role === 'Admin' || 
                                    currentUser?.role === 'Administración' || 
                                    currentUser?.role === 'Supervisor' || 
                                    currentUser?.role === 'Gerente de Planta' ||
                                    currentUser?.email?.toLowerCase() === 'barbarac@diamante.com';

        if (currentUser?.role && !isCompanyWideViewer) {
            const currentName = (currentUser.name || '').trim().toLowerCase();
            const currentEmail = (currentUser.email || '').trim().toLowerCase();
            filtered = filtered.filter(s => {
                const saleUser = (s.user || '').trim().toLowerCase();
                if (saleUser === currentName) return true;
                if (currentEmail && saleUser === currentEmail) return true;
                if (currentName.includes('barbara') && saleUser.includes('babara')) return true;
                if (currentName.includes('babara') && saleUser.includes('barbara')) return true;
                return false;
            });
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
    
    const userVisibleSales = useMemo(() => {
        if (!sales) return [];
        let list = [...sales];
        const isCompanyWideViewer = currentUser?.role === 'Admin' || 
                                    currentUser?.role === 'Administración' || 
                                    currentUser?.role === 'Supervisor' || 
                                    currentUser?.role === 'Gerente de Planta' ||
                                    currentUser?.email?.toLowerCase() === 'barbarac@diamante.com';

        if (currentUser?.role && !isCompanyWideViewer) {
            const currentName = (currentUser.name || '').trim().toLowerCase();
            const currentEmail = (currentUser.email || '').trim().toLowerCase();
            list = list.filter(s => {
                const saleUser = (s.user || '').trim().toLowerCase();
                if (saleUser === currentName) return true;
                if (currentEmail && saleUser === currentEmail) return true;
                if (currentName.includes('barbara') && saleUser.includes('babara')) return true;
                if (currentName.includes('babara') && saleUser.includes('barbara')) return true;
                return false;
            });
        }
        return list;
    }, [sales, currentUser]);

    const pendingSales = useMemo(() => {
        let list = userVisibleSales.filter(s => s.status === 'Pendiente');
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(s => {
                const matchCustomer = (s.customerName?.toLowerCase() || "").includes(query);
                const matchInvoice = (s.invoiceNumber?.toLowerCase() || "").includes(query);
                const items = getSaleItems(s);
                const matchProduct = items.some(i => i.productName.toLowerCase().includes(query));
                return matchCustomer || matchInvoice || matchProduct;
            });
        }
        return list.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });
    }, [userVisibleSales, searchQuery]);
    
    const dispatchedSales = useMemo(() => {
        let list = userVisibleSales.filter(s => s.status === 'Despachado' || s.status === 'Pagado' || s.status === 'Por Cobrar');

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(s => {
                const matchCustomer = (s.customerName?.toLowerCase() || "").includes(query);
                const matchInvoice = (s.invoiceNumber?.toLowerCase() || "").includes(query);
                const items = getSaleItems(s);
                const matchProduct = items.some(i => i.productName.toLowerCase().includes(query));
                return matchCustomer || matchInvoice || matchProduct;
            });
        }

        if (dispatchedDate?.from) {
            const fromDate = new Date(dispatchedDate.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = dispatchedDate.to ? new Date(dispatchedDate.to) : new Date(dispatchedDate.from);
            toDate.setHours(23, 59, 59, 999);
            list = list.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= fromDate && saleDate <= toDate;
            });
        }

        return list.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });
    }, [userVisibleSales, searchQuery, dispatchedDate]);

    const receivableSales = useMemo(() => {
        let list = userVisibleSales.filter(s => s.status === 'Por Cobrar');

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(s => {
                const matchCustomer = (s.customerName?.toLowerCase() || "").includes(query);
                const matchInvoice = (s.invoiceNumber?.toLowerCase() || "").includes(query);
                const items = getSaleItems(s);
                const matchProduct = items.some(i => i.productName.toLowerCase().includes(query));
                return matchCustomer || matchInvoice || matchProduct;
            });
        }

        return list.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });
    }, [userVisibleSales, searchQuery]);

    const totalReceivablePendingAmount = useMemo(() => {
        return receivableSales.reduce((acc, sale) => {
            const total = Number(sale.totalAmount) || 0;
            const abono = Number(sale.partialPaymentAmount) || 0;
            return acc + Math.max(0, total - abono);
        }, 0);
    }, [receivableSales]);

    const consignmentSales = receivableSales;
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
        setCollectPaymentDialogOpen(false);
        setSaleToCollect(null);
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
            const baseTitle = sale.documentType === 'Factura' ? 'Factura' : 'Nota de Entrega';
            const docTitle = sale.saleType === 'Cortesía' ? `${baseTitle} (Cortesía)` : baseTitle;
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
                foot: [['', '', 'TOTAL:', sale.saleType === 'Cortesía' ? '$0.00 (Cortesía)' : formatCurrency(sale.totalAmount)]],
                footStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                },
            });
    
            const finalY = (doc as any).lastAutoTable.finalY || (yOffset + 60);
    
            if (sale.saleType === 'Cortesía') {
                doc.setFontSize(9);
                doc.setTextColor(120);
                doc.text("* Entrega de Cortesía / Muestra sin valor comercial.", margin, finalY + 6);
                doc.setTextColor(0);
            }

            if (sale.description) {
                doc.setFontSize(9);
                doc.text("Notas:", margin, finalY + (sale.saleType === 'Cortesía' ? 12 : 10));
                doc.text(sale.description, margin, finalY + (sale.saleType === 'Cortesía' ? 16 : 14), { maxWidth: pageWidth - (margin * 2) });
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

    const handleCollectPaymentConfirm = async (paymentData: { method: string, reference?: string, receiptFile?: File | null }) => {
        if (saleToCollect && currentUser) {
            await collectConsignmentPayment(saleToCollect, currentUser, paymentData);
        }
        handleCloseDialogs();
    };
    
    const handleRequestCancel = (sale: Sale) => {
        const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Administración';
        if (isAdmin) {
            setAlertDialog({ open: true, type: 'cancel', sale });
        } else {
            setSaleToCancel(sale);
            setAdminKey('');
            setAdminAuthError(null);
            const defaultAdmin = adminUsers[0]?.email || '';
            setSelectedAdminEmail(defaultAdmin);
            setAdminAuthDialogOpen(true);
        }
    };

    const handleAuthorizeAndCancel = async () => {
        if (!saleToCancel || !adminKey.trim()) return;
        setIsVerifying(true);
        setAdminAuthError(null);

        try {
            const isValid = await verifyAdminCredentials(selectedAdminEmail, adminKey.trim());
            if (!isValid) {
                setAdminAuthError("Clave o contraseña de administrador incorrecta. Verifique e intente nuevamente.");
                setIsVerifying(false);
                return;
            }

            const foundAdmin = adminUsers.find(u => u.email.toLowerCase() === selectedAdminEmail.toLowerCase());
            const authorizingAdminName = foundAdmin ? foundAdmin.name : 'Administrador';

            const authorizedUser = {
                name: `${currentUser?.name || 'Vendedor'} (Autorizado por Admin: ${authorizingAdminName})`
            };

            await cancelSaleOrder(saleToCancel, authorizedUser);

            toast({
                title: "Venta Anulada",
                description: `La orden ${saleToCancel.invoiceNumber} fue anulada con la autorización del administrador ${authorizingAdminName}.`
            });

            setAdminAuthDialogOpen(false);
            setSaleToCancel(null);
            setAdminKey('');
        } catch (error: any) {
            console.error("Error al autorizar anulación:", error);
            setAdminAuthError(error.message || "Error al verificar la clave de administrador.");
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleCancel = async () => {
        if (alertDialog.sale && currentUser) {
            const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Administración';
            if (!isAdmin) {
                const sale = alertDialog.sale;
                handleCloseDialogs();
                handleRequestCancel(sale);
                return;
            }
            await cancelSaleOrder(alertDialog.sale, currentUser);
        }
        handleCloseDialogs();
    };

    const getStatusBadge = (sale: Sale) => {
        const status = sale.status;
        const saleType = sale.saleType;
        const baseClasses = "capitalize";

        if (saleType === 'Cortesía') {
            if (status === 'Pendiente') {
                return { className: cn(baseClasses, "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"), label: "Cortesía Pendiente" };
            }
            if (status === 'Cancelado') {
                return { className: cn(baseClasses, "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"), label: "Cancelado" };
            }
            return { className: cn(baseClasses, "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"), label: "Cortesía Entregada" };
        }

        if (status === 'Pendiente') {
            return { className: cn(baseClasses, "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"), label: "Pendiente" };
        }
        if (status === 'Por Cobrar') {
            return { className: cn(baseClasses, "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800"), label: "Por Cobrar" };
        }
        if (status === 'Despachado') {
            const label = saleType === 'Consignación' ? "Consignación" : (sale.partialPaymentAmount ? "Pago Parcial" : "Despachado");
            return { className: cn(baseClasses, "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"), label: label };
        }
        if (status === 'Pagado') {
            return { className: cn(baseClasses, "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"), label: "Pagado" };
        }
        if (status === 'Cancelado') {
            return { className: cn(baseClasses, "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"), label: "Cancelado" };
        }
        return { className: baseClasses, label: status };
    };
    
    const canDispatch = !currentUser || currentUser.role === 'Admin' || currentUser.role === 'Administración' || currentUser.role === 'Supervisor' || currentUser.role === 'Vendedor' || currentUser.role === 'Operador' || currentUser.role === 'Gerente de Planta' || (currentUser.permissions?.sales ?? true);

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
                                            {sale.dueDate && (
                                                <div className="text-xs font-medium mt-1 flex items-center gap-1 flex-wrap">
                                                    <span className={cn(sale.status === 'Por Cobrar' && new Date(sale.dueDate) < new Date() ? "text-red-600 font-bold" : "text-amber-600")}>
                                                        Vence: {isClient ? format(new Date(sale.dueDate), "dd/MM/yyyy") : ''}
                                                    </span>
                                                    {sale.status === 'Por Cobrar' && new Date(sale.dueDate) < new Date() && (
                                                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 uppercase font-semibold">
                                                            Vencida
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            {(!sale.dueDate && sale.paymentMethod) && (
                                                <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                    {sale.paymentMethod} {sale.referenceNumber ? `(Ref: ${sale.referenceNumber})` : ''}
                                                </div>
                                            )}
                                            {(sale.dueDate && sale.partialPaymentAmount && sale.partialPaymentAmount > 0) ? (
                                                <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                    {sale.paymentMethod} {sale.referenceNumber ? `(Ref: ${sale.referenceNumber})` : ''}
                                                </div>
                                            ) : null}
                                            {sale.finalPaymentMethod && (
                                                <div className="text-xs text-emerald-600 mt-1 font-medium">
                                                    Pago Final: {sale.finalPaymentMethod} {sale.finalReferenceNumber ? `(Ref: ${sale.finalReferenceNumber})` : ''}
                                                </div>
                                            )}
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
                                        <TableCell className="hidden sm:table-cell text-right font-mono">
                                            {sale.saleType === 'Cortesía' ? (
                                                <div>
                                                    <div className="font-semibold text-purple-700 dark:text-purple-400">$0.00</div>
                                                    <span className="inline-block text-[10px] font-sans px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-medium">
                                                        Cortesía
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={cn(sale.status === 'Por Cobrar' && "font-semibold")}>
                                                        {formatCurrency(sale.totalAmount)}
                                                    </div>
                                                    {sale.partialPaymentAmount ? (
                                                        <div className="text-xs text-muted-foreground mt-0.5">Abono: {formatCurrency(sale.partialPaymentAmount)}</div>
                                                    ) : null}
                                                    {sale.status === 'Por Cobrar' && (
                                                        <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-0.5">
                                                            Resta: {formatCurrency(sale.totalAmount - (sale.partialPaymentAmount || 0))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-right font-mono text-emerald-500">
                                            {sale.commissionAmount ? formatCurrency(sale.commissionAmount) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge className={getStatusBadge(sale).className}>
                                                {getStatusBadge(sale).label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{sale.user}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {sale.status === 'Por Cobrar' && (
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs" 
                                                        onClick={() => { setSaleToCollect(sale); setCollectPaymentDialogOpen(true); }}
                                                    >
                                                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                                                        Cobrar
                                                    </Button>
                                                )}
                                                {sale.status === 'Pendiente' && canDispatch && (
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs" 
                                                        onClick={() => setAlertDialog({ open: true, type: 'dispatch', sale })}
                                                    >
                                                        <PackageCheck className="mr-1 h-3.5 w-3.5" />
                                                        Despachar
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        {sale.receiptUrl && <DropdownMenuItem onClick={() => window.open(sale.receiptUrl, '_blank')}><FileText className="mr-2 h-4 w-4"/>Ver Comprobante Abono</DropdownMenuItem>}
                                                        {sale.finalReceiptUrl && <DropdownMenuItem onClick={() => window.open(sale.finalReceiptUrl, '_blank')}><FileText className="mr-2 h-4 w-4"/>Ver Comprobante Final</DropdownMenuItem>}
                                                        {sale.status === 'Pendiente' && canDispatch && <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'dispatch', sale })}><PackageCheck className="mr-2 h-4 w-4"/>Despachar</DropdownMenuItem>}
                                                        {sale.status === 'Por Cobrar' && <DropdownMenuItem onClick={() => { setSaleToCollect(sale); setCollectPaymentDialogOpen(true); }}><DollarSign className="mr-2 h-4 w-4"/>Registrar Pago Final</DropdownMenuItem>}
                                                        {sale.status === 'Pendiente' && <DropdownMenuItem onClick={() => handleOpenEditDialog(sale)}>Editar</DropdownMenuItem>}
                                                        {sale.status !== 'Cancelado' && <DropdownMenuItem onClick={() => handleRequestCancel(sale)} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><AlertTriangle className="mr-2 h-4 w-4"/>Anular Orden</DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
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

            {currentUser?.role === 'Vendedor' && sellerCreditStatus && (
                <div className={cn(
                    "rounded-xl border p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all",
                    sellerCreditStatus.isLocked 
                        ? "border-red-300 bg-red-50/70 dark:bg-red-950/30 dark:border-red-900" 
                        : "border-sky-200 bg-gradient-to-r from-sky-50/80 via-indigo-50/40 to-white dark:from-sky-950/20 dark:via-indigo-950/20 dark:to-background dark:border-sky-900/50"
                )}>
                    <div className="flex items-center gap-3.5">
                        <div className="text-3xl p-2.5 rounded-2xl bg-white dark:bg-card shadow-xs border">
                            {sellerCreditStatus.levelEmoji}
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm tracking-tight">Tu Crédito Cashea:</span>
                                <Badge className="bg-primary/90 text-primary-foreground font-semibold text-xs">
                                    Nivel {sellerCreditStatus.level} · {sellerCreditStatus.levelName}
                                </Badge>
                                {sellerCreditStatus.isLocked && (
                                    <Badge variant="destructive" className="text-[10px] uppercase font-bold animate-pulse">
                                        Bloqueado por Mora
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Cupo máximo: <strong>{sellerCreditStatus.maxCreditBoxes} cajas</strong> • Retiradas pendientes: <strong>{sellerCreditStatus.currentCreditDebtBoxes} cajas</strong>
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-80 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-muted-foreground">Cajas Disponibles</span>
                            <span className={cn("font-mono font-bold", sellerCreditStatus.availableBoxes === 0 ? "text-red-600" : "text-emerald-600")}>
                                {sellerCreditStatus.availableBoxes} / {sellerCreditStatus.maxCreditBoxes} cajas
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                                className={cn("h-full transition-all rounded-full", sellerCreditStatus.isLocked ? "bg-red-500" : "bg-emerald-500")}
                                style={{ width: `${Math.min(100, (sellerCreditStatus.availableBoxes / sellerCreditStatus.maxCreditBoxes) * 100)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground text-right">
                            {sellerCreditStatus.level < 4 && sellerCreditStatus.nextLevel
                                ? `${sellerCreditStatus.onTimePaymentsCount}/${sellerCreditStatus.paymentsToNextLevel} pagos a tiempo para Nivel ${sellerCreditStatus.level + 1} (${CREDIT_LEVELS[sellerCreditStatus.nextLevel].name})`
                                : "👑 Nivel Máximo Alcanzado (250 cajas)"}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
                <Card 
                    onClick={() => handleCardClick('dispatched')}
                    className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-400 select-none group relative overflow-hidden",
                        activeTab === 'dispatched' ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20" : "hover:bg-muted/30"
                    )}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Ventas Totales
                        </CardTitle>
                        <div className="p-1.5 rounded-full bg-blue-100/70 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalFilteredSalesAmount)}</div>
                        <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                            <span>{filteredSales.length} órdenes en total</span>
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                                Ver historial ↓
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones Generadas</CardTitle>
                        <div className="p-1.5 rounded-full bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFilteredCommissions)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Rendimiento del equipo</p>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => handleCardClick('pending')}
                    className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-yellow-400 select-none group relative overflow-hidden",
                        activeTab === 'pending' ? "ring-2 ring-yellow-500 border-yellow-500 bg-yellow-50/20 dark:bg-yellow-950/20" : "hover:bg-muted/30"
                    )}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                                Órdenes Pendientes
                            </CardTitle>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 font-medium">
                                Despacho
                            </span>
                        </div>
                        <div className="p-1.5 rounded-full bg-yellow-100/70 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400 group-hover:scale-110 transition-transform">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingSales.length}</div>
                        <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                            <span>Requieren despacho</span>
                            <span className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium group-hover:underline">
                                Ver pendientes ↓
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => handleCardClick('receivable')}
                    className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-orange-400 select-none group relative overflow-hidden",
                        activeTab === 'receivable' ? "ring-2 ring-orange-500 border-orange-500 bg-orange-50/20 dark:bg-orange-950/20" : "hover:bg-muted/30"
                    )}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                Por Cobrar
                            </CardTitle>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-medium">
                                Pago Pendiente
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-orange-600 hover:bg-orange-100/50"
                                title="Vista Rápida de Pendientes por Pago"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickReceivablesDialogOpen(true);
                                }}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <div className="p-1.5 rounded-full bg-orange-100/70 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 group-hover:scale-110 transition-transform">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{receivableSales.length}</div>
                            {totalReceivablePendingAmount > 0 && (
                                <div className="text-xs font-semibold text-muted-foreground font-mono">
                                    Saldo: {formatCurrency(totalReceivablePendingAmount)}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                            <span>Consignaciones activas</span>
                            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium group-hover:underline flex items-center gap-0.5">
                                Clic para ver órdenes ↓
                            </span>
                        </p>
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

            <div ref={tableSectionRef} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="pending" className="flex items-center gap-1.5">
                        <span>Pendientes Despacho</span>
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                            {pendingSales.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="receivable" className="flex items-center gap-1.5 data-[state=active]:text-orange-600">
                        <span>Por Cobrar</span>
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                            {receivableSales.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="dispatched" className="flex items-center gap-1.5">
                        <span>Despachadas</span>
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs font-semibold">
                            {dispatchedSales.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="flex items-center gap-1.5">
                        <span>Canceladas</span>
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs font-semibold">
                            {cancelledSales.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">{renderSalesTable(pendingSales, 'Pendientes de Despacho')}</TabsContent>
                <TabsContent value="receivable" className="mt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-orange-950 dark:text-orange-200">
                                    Órdenes Pendientes por Pago (Por Cobrar)
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {receivableSales.length} {receivableSales.length === 1 ? 'orden pendiente' : 'órdenes pendientes'} de cobro • Ventas en consignación o crédito con saldo pendiente
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground block">Total Saldo Pendiente</span>
                                <span className="text-lg font-bold text-orange-600 dark:text-orange-400 font-mono">
                                    {formatCurrency(totalReceivablePendingAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {renderSalesTable(receivableSales, 'Pendientes de Pago')}
                </TabsContent>
                <TabsContent value="dispatched" className="mt-4 space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3.5 rounded-xl border bg-muted/40 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold">Búsqueda de Despachadas por Fecha</h4>
                                <p className="text-xs text-muted-foreground">
                                    {dispatchedDate?.from ? (
                                        <>Filtrando desde <span className="font-medium text-foreground">{format(dispatchedDate.from, "dd/MM/yyyy")}</span> hasta <span className="font-medium text-foreground">{dispatchedDate.to ? format(dispatchedDate.to, "dd/MM/yyyy") : format(dispatchedDate.from, "dd/MM/yyyy")}</span> ({dispatchedSales.length} órdenes)</>
                                    ) : (
                                        <>Mostrando todas las órdenes despachadas ({dispatchedSales.length} órdenes)</>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5 shadow-xs">
                                <Button 
                                    type="button"
                                    variant={isQuickActive('today') ? "default" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setQuickRange('today')}
                                >
                                    Hoy
                                </Button>
                                <Button 
                                    type="button"
                                    variant={isQuickActive('7days') ? "default" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setQuickRange('7days')}
                                >
                                    7 días
                                </Button>
                                <Button 
                                    type="button"
                                    variant={isQuickActive('month') ? "default" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setQuickRange('month')}
                                >
                                    Este Mes
                                </Button>
                                <Button 
                                    type="button"
                                    variant={isQuickActive('all') ? "default" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setQuickRange('all')}
                                >
                                    Todas
                                </Button>
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-xs font-normal border-dashed">
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                        {dispatchedDate?.from ? (
                                            dispatchedDate.to ? (
                                                `${format(dispatchedDate.from, "dd/MM/yyyy")} - ${format(dispatchedDate.to, "dd/MM/yyyy")}`
                                            ) : (
                                                format(dispatchedDate.from, "dd/MM/yyyy")
                                            )
                                        ) : (
                                            "Rango Personalizado"
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar 
                                        initialFocus 
                                        mode="range" 
                                        defaultMonth={dispatchedDate?.from || new Date()} 
                                        selected={dispatchedDate} 
                                        onSelect={setDispatchedDate} 
                                        numberOfMonths={2} 
                                        locale={es}
                                    />
                                </PopoverContent>
                            </Popover>

                            {dispatchedDate && (
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setDispatchedDate(undefined)} 
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Restablecer
                                </Button>
                            )}
                        </div>
                    </div>

                    {renderSalesTable(dispatchedSales, 'Despachadas')}
                </TabsContent>
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
                        creditStatus={sellerCreditStatus}
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
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseDialogs}>No, volver</AlertDialogCancel>
                        <AlertDialogAction onClick={alertDialog.type === 'dispatch' ? handleDispatch : handleCancel}>
                           {alertDialog.type === 'dispatch' && 'Sí, Despachar'}
                           {alertDialog.type === 'cancel' && 'Sí, Anular'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CollectPaymentDialog
                open={collectPaymentDialogOpen}
                onOpenChange={setCollectPaymentDialogOpen}
                sale={saleToCollect}
                onConfirm={handleCollectPaymentConfirm}
            />

            {/* Modal de Autorización de Administrador para Anulación por Vendedores */}
            <Dialog 
                open={adminAuthDialogOpen} 
                onOpenChange={(open) => {
                    if (!isVerifying) {
                        setAdminAuthDialogOpen(open);
                        if (!open) {
                            setSaleToCancel(null);
                            setAdminKey('');
                            setAdminAuthError(null);
                        }
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                                <ShieldAlert className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Autorización de Administrador</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Clave de seguridad requerida para anular venta
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-muted/50 p-3.5 text-sm space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground font-medium">Nº Factura / Orden:</span>
                                <span className="font-semibold font-mono text-foreground">{saleToCancel?.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground font-medium">Cliente:</span>
                                <span className="font-medium text-foreground">{saleToCancel?.customerName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground font-medium">Monto Total:</span>
                                <span className="font-bold text-foreground">{saleToCancel ? formatCurrency(saleToCancel.totalAmount) : ''}</span>
                            </div>
                            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium pt-1.5 border-t border-border/50">
                                ⚠️ Los vendedores deben solicitar a un Administrador que ingrese su clave o contraseña para anular esta orden.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="admin-select" className="text-xs font-semibold">Administrador Autorizador</Label>
                            <Select 
                                value={selectedAdminEmail} 
                                onValueChange={(val) => {
                                    setSelectedAdminEmail(val);
                                    setAdminAuthError(null);
                                }}
                            >
                                <SelectTrigger id="admin-select" className="w-full">
                                    <SelectValue placeholder="Seleccione el Administrador" />
                                </SelectTrigger>
                                <SelectContent>
                                    {adminUsers.map((admin) => (
                                        <SelectItem key={admin.email} value={admin.email}>
                                            {admin.name} ({admin.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="admin-key" className="text-xs font-semibold">Clave / Contraseña del Administrador</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="admin-key"
                                    type="password"
                                    placeholder="Introduce la contraseña o clave del admin"
                                    value={adminKey}
                                    onChange={(e) => {
                                        setAdminKey(e.target.value);
                                        setAdminAuthError(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && adminKey.trim() && !isVerifying) {
                                            handleAuthorizeAndCancel();
                                        }
                                    }}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Ingrese la contraseña de la cuenta del administrador o la clave administrativa del sistema.
                            </p>
                        </div>

                        {adminAuthError && (
                            <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{adminAuthError}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                setAdminAuthDialogOpen(false);
                                setSaleToCancel(null);
                                setAdminKey('');
                                setAdminAuthError(null);
                            }}
                            disabled={isVerifying}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="button" 
                            variant="destructive"
                            onClick={handleAuthorizeAndCancel}
                            disabled={isVerifying || !adminKey.trim()}
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Autorizar y Anular
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Modal de Vista Rápida de Órdenes Pendientes por Pago (Por Cobrar) */}
            <Dialog open={quickReceivablesDialogOpen} onOpenChange={setQuickReceivablesDialogOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Órdenes Pendientes por Pago</DialogTitle>
                                <DialogDescription className="text-xs">
                                    {receivableSales.length} {receivableSales.length === 1 ? 'orden por cobrar' : 'órdenes por cobrar'} • Saldo total pendiente: <strong className="text-foreground font-mono">{formatCurrency(totalReceivablePendingAmount)}</strong>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-3">
                        {receivableSales.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <PackageCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="font-medium">No hay órdenes pendientes por cobrar</p>
                                <p className="text-xs">Todas las consignaciones y créditos están al día.</p>
                            </div>
                        ) : (
                            receivableSales.map((sale) => {
                                const total = Number(sale.totalAmount) || 0;
                                const abono = Number(sale.partialPaymentAmount) || 0;
                                const resta = Math.max(0, total - abono);
                                const isOverdue = sale.dueDate && new Date(sale.dueDate) < new Date();
                                const items = getSaleItems(sale);

                                return (
                                    <div key={sale.id} className="p-3.5 rounded-xl border bg-card hover:border-orange-300 dark:hover:border-orange-800 transition-colors shadow-2xs space-y-2">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm font-mono">{sale.invoiceNumber}</span>
                                                    <Badge variant="outline" className="text-[10px] border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                                        Por Cobrar
                                                    </Badge>
                                                    {isOverdue && (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            Vencida
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="font-medium text-sm text-foreground mt-0.5">{sale.customerName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Vendedor: {sale.user} • Fecha: {isClient ? format(new Date(sale.date), "dd/MM/yyyy", { locale: es }) : ''}
                                                    {sale.dueDate && ` • Vence: ${isClient ? format(new Date(sale.dueDate), "dd/MM/yyyy") : ''}`}
                                                </p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <span className="text-[11px] text-muted-foreground block">Resta por Cobrar:</span>
                                                <span className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
                                                    {formatCurrency(resta)}
                                                </span>
                                                {abono > 0 && (
                                                    <span className="text-[11px] text-muted-foreground block">
                                                        Total: {formatCurrency(total)} (Abono: {formatCurrency(abono)})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t text-xs gap-2">
                                            <span className="text-muted-foreground truncate max-w-sm">
                                                {items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                                            </span>
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                {sale.receiptUrl && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-xs px-2"
                                                        onClick={() => window.open(sale.receiptUrl, '_blank')}
                                                    >
                                                        <FileText className="h-3.5 w-3.5 mr-1" />
                                                        Comprobante
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                    onClick={() => {
                                                        setQuickReceivablesDialogOpen(false);
                                                        setSaleToCollect(sale);
                                                        setCollectPaymentDialogOpen(true);
                                                    }}
                                                >
                                                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                                                    Registrar Pago
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setQuickReceivablesDialogOpen(false);
                                handleCardClick('receivable');
                            }}
                        >
                            Ver en la tabla principal →
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setQuickReceivablesDialogOpen(false)}
                        >
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
