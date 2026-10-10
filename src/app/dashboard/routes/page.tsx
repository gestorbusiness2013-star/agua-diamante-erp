'use client';

import { useState, useMemo } from "react";
import { 
    PlusCircle, 
    Edit, 
    Trash2, 
    Map, 
    Warehouse as WarehouseIcon, 
    Route as RouteIcon,
    Users, 
    UserCheck, 
    Calendar, 
    Search,
    AlertCircle,
    CheckCircle2,
    Building2,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useInventory } from "@/context/inventory-context";
import { RouteForm, type RouteFormValues } from "@/components/route-form";
import type { Route } from "@/lib/routes-data";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RoutesPage() {
    const { routes, customers, saveRoute, deleteRoute, warehouses, users } = useInventory();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Filtros de búsqueda
    const [searchQuery, setSearchQuery] = useState("");
    const [warehouseFilter, setWarehouseFilter] = useState("all");

    // ── Estadísticas y KPIs de Cobertura ──
    const stats = useMemo(() => {
        const totalRoutes = routes.length;
        const totalCustomers = customers.length;
        
        // Clientes únicos asignados a alguna ruta
        const assignedCustomerIds = new Set(routes.flatMap(r => r.customerIds));
        const customersInRoutes = assignedCustomerIds.size;
        const unassignedCustomers = Math.max(0, totalCustomers - customersInRoutes);
        const coverageRate = totalCustomers > 0 ? Math.round((customersInRoutes / totalCustomers) * 100) : 0;
        
        // Vendedores únicos con rutas asignadas
        const assignedSellers = new Set(routes.map(r => r.sellerId).filter(Boolean));

        return {
            totalRoutes,
            totalCustomers,
            customersInRoutes,
            unassignedCustomers,
            coverageRate,
            assignedSellersCount: assignedSellers.size,
        };
    }, [routes, customers]);

    // ── Filtrado dinámico de rutas ──
    const filteredRoutes = useMemo(() => {
        return routes.filter(route => {
            // Filtro por almacén
            if (warehouseFilter !== 'all') {
                if (warehouseFilter === 'factory' && route.warehouseId && route.warehouseId !== 'factory') {
                    return false;
                }
                if (warehouseFilter !== 'factory' && String(route.warehouseId) !== warehouseFilter) {
                    return false;
                }
            }

            // Filtro por texto
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();

            const matchName = route.name.toLowerCase().includes(q);
            const matchSeller = (route.sellerName || '').toLowerCase().includes(q);
            const matchWarehouse = (route.warehouseName || '').toLowerCase().includes(q);
            const matchDays = (route.visitDays || []).some(d => d.toLowerCase().includes(q));
            
            // Buscar si contiene un cliente con ese nombre
            const matchCustomer = route.customerIds.some(cid => {
                const c = customers.find(cust => String(cust.id) === String(cid));
                return c && (c.name.toLowerCase().includes(q) || (c.address && c.address.toLowerCase().includes(q)));
            });

            return matchName || matchSeller || matchWarehouse || matchDays || matchCustomer;
        });
    }, [routes, searchQuery, warehouseFilter, customers]);

    const handleOpenDialog = (route?: Route) => {
        setSelectedRoute(route || null);
        setIsEditMode(!!route);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedRoute(null);
    };

    const handleSubmit = async (values: RouteFormValues) => {
        await saveRoute(values, isEditMode, selectedRoute);
        handleCloseDialog();
    };

    const handleOpenDeleteDialog = (route: Route, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRouteToDelete(route);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (routeToDelete) {
            await deleteRoute(routeToDelete.id);
            setDeleteAlertOpen(false);
            setRouteToDelete(null);
        }
    };

    // ── Apertura Segura de Google Maps (sin side-effects en render) ──
    const handleOpenRouteInMap = (route: Route, e?: React.MouseEvent) => {
        e?.stopPropagation();

        let originAddress = route.startAddress;
        if (!originAddress && route.warehouseId) {
            if (route.warehouseId === 'factory') {
                originAddress = "Agua Diamante, Guacara, Carabobo, Venezuela";
            } else {
                const wh = warehouses.find(w => String(w.id) === String(route.warehouseId));
                originAddress = wh?.address || wh?.name;
            }
        }
        if (!originAddress) {
            originAddress = route.warehouseName || "Agua Diamante, Guacara, Carabobo, Venezuela";
        }

        // Obtener destinos válidos de los clientes en la ruta
        const customerPoints = route.customerIds
            .map(id => customers.find(c => String(c.id) === String(id)))
            .filter((c): c is NonNullable<typeof c> => !!c && (!!c.address || !!c.geolocation))
            .map(c => {
                // Si tiene dirección la usamos; si tiene geolocalización url la limpiamos
                return encodeURIComponent(c.address || c.geolocation || '');
            })
            .filter(Boolean);

        if (customerPoints.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No hay clientes con dirección',
                description: 'Esta ruta no tiene clientes con direcciones válidas para trazar la ruta en Google Maps.'
            });
            return;
        }

        const origin = encodeURIComponent(originAddress);
        let mapUrl = '';

        if (customerPoints.length === 1) {
            mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${customerPoints[0]}`;
        } else {
            // El último cliente es el destino final, los demás son waypoints
            const pointsCopy = [...customerPoints];
            const destination = pointsCopy.pop()!;
            const waypoints = pointsCopy.join('|');
            mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
        }

        window.open(mapUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-5">
            {/* ── Encabezado y Botón Crear ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <RouteIcon className="h-7 w-7 text-primary" />
                        Rutas de Venta
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Planifica la distribución geográfica de clientes, asigna vendedores y traza recorridos en Google Maps.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Ruta
                </Button>
            </div>

            {/* ── Tarjetas KPIs de Cobertura y Desempeño ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4 border-l-4 border-l-primary shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rutas Activas</p>
                        <RouteIcon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-black font-mono mt-1 text-foreground">{stats.totalRoutes}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">En operación</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes en Ruta</p>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black font-mono mt-1 text-emerald-800 dark:text-emerald-300">
                        {stats.customersInRoutes}
                        <span className="text-xs font-normal text-muted-foreground ml-1.5">({stats.coverageRate}%)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">De {stats.totalCustomers} clientes registrados</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sin Ruta Asignada</p>
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-2xl font-black font-mono mt-1 text-amber-800 dark:text-amber-300">
                        {stats.unassignedCustomers}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Oportunidad de asignación</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedores con Ruta</p>
                        <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl font-black font-mono mt-1 text-blue-800 dark:text-blue-300">
                        {stats.assignedSellersCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Fuerza comercial activa</p>
                </Card>
            </div>

            {/* ── Barra de Búsqueda y Filtros ── */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por ruta, vendedor, almacén o cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-xs shadow-xs"
                    />
                </div>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-full sm:w-[220px] h-10 text-xs shrink-0 shadow-xs">
                        <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Filtrar por almacén" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los almacenes</SelectItem>
                        <SelectItem value="factory">Fábrica Principal (Guacara)</SelectItem>
                        {warehouses.map(w => (
                            <SelectItem key={w.id} value={String(w.id)}>
                                {w.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* ── Listado de Rutas con Acordeón ── */}
            <Card className="shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Listado de Rutas Registradas</CardTitle>
                            <CardDescription className="text-xs">
                                Mostrando {filteredRoutes.length} de {routes.length} rutas
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredRoutes.length === 0 ? (
                        <div className="p-10 text-center space-y-2">
                            <RouteIcon className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                            <p className="text-sm font-medium text-foreground">
                                {routes.length === 0 ? "No hay rutas de venta creadas." : "No se encontraron rutas con el filtro aplicado."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {routes.length === 0 
                                    ? "Haz clic en 'Crear Ruta' para comenzar a organizar tu logística de despacho." 
                                    : "Intenta cambiar los términos de búsqueda o el filtro de almacén."}
                            </p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full divide-y">
                            {filteredRoutes.map(route => {
                                const routeCustomers = route.customerIds
                                    .map(id => customers.find(c => String(c.id) === String(id)))
                                    .filter(Boolean);
                                const originLabel = route.warehouseName || 'Fábrica Principal (Agua Diamante)';

                                return (
                                    <AccordionItem value={`item-${route.id}`} key={route.id} className="border-0 px-4 py-2 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <AccordionTrigger className="flex-1 hover:no-underline py-2">
                                                <div className="flex flex-col items-start text-left gap-1.5 min-w-0 pr-2">
                                                    {/* Nombre y Badges Principales */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-base text-foreground">{route.name}</span>
                                                        
                                                        <Badge variant="outline" className="text-[11px] font-medium flex items-center gap-1 bg-muted/50 border-border">
                                                            <WarehouseIcon className="h-3 w-3 text-muted-foreground" />
                                                            {originLabel}
                                                        </Badge>

                                                        {route.sellerName ? (
                                                            <Badge className="text-[11px] font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-0 flex items-center gap-1">
                                                                <UserCheck className="h-3 w-3" />
                                                                {route.sellerName}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground">
                                                                Sin vendedor
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Días de Visita y Clientes */}
                                                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground flex items-center gap-1">
                                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {route.customerIds.length} cliente(s)
                                                        </span>

                                                        {route.visitDays && route.visitDays.length > 0 && (
                                                            <>
                                                                <span>•</span>
                                                                <div className="flex items-center gap-1 flex-wrap">
                                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                                    {route.visitDays.map(day => (
                                                                        <span key={day} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                                                                            {day}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}

                                                        {route.startAddress && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-[11px] italic truncate max-w-xs">{route.startAddress}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            {/* Botones de Acción */}
                                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 gap-1.5 text-xs text-primary hover:text-primary font-semibold shadow-xs"
                                                    onClick={(e) => handleOpenRouteInMap(route, e)}
                                                >
                                                    <Map className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Ver Mapa</span>
                                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDialog(route);
                                                    }}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                    <span className="sr-only">Editar ruta</span>
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                                    onClick={(e) => handleOpenDeleteDialog(route, e)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    <span className="sr-only">Eliminar ruta</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Detalle Desplegable: Clientes de la Ruta */}
                                        <AccordionContent className="pt-2 pb-3 px-1">
                                            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-1">
                                                    <span>Paradas y Clientes ({routeCustomers.length})</span>
                                                    <span>Dirección de Despacho</span>
                                                </div>
                                                {routeCustomers.length > 0 ? (
                                                    <div className="space-y-1.5 divide-y divide-border/40">
                                                        {routeCustomers.map((customer, idx) => (
                                                            customer && (
                                                                <div key={customer.id} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                            {idx + 1}
                                                                        </span>
                                                                        <span className="font-semibold text-foreground truncate">{customer.name}</span>
                                                                        {customer.phone && (
                                                                            <span className="text-[10px] text-muted-foreground">({customer.phone})</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-muted-foreground italic text-right truncate max-w-sm pl-2">
                                                                        {customer.address || 'Sin dirección registrada'}
                                                                    </span>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground py-2 text-center">Esta ruta no tiene clientes asignados actualmente.</p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* ── Modal de Creación / Edición de Ruta ── */}
            <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Ruta de Venta' : 'Crear Nueva Ruta de Venta'}</DialogTitle>
                        <DialogDescription className="text-xs">
                            {isEditMode 
                                ? 'Actualiza el almacén de salida, el vendedor responsable, los días de visita y los clientes.' 
                                : 'Configura el almacén de partida, asigna un vendedor, los días de visita y selecciona los clientes.'}
                        </DialogDescription>
                    </DialogHeader>
                    <RouteForm
                        initialData={selectedRoute}
                        customers={customers}
                        routes={routes}
                        warehouses={warehouses}
                        users={users}
                        onSubmit={handleSubmit}
                        onClose={handleCloseDialog}
                    />
                </DialogContent>
            </Dialog>

            {/* ── Diálogo de Confirmación de Eliminación ── */}
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Ruta de Venta?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            Esta acción eliminará la ruta <strong className="text-foreground">{routeToDelete?.name}</strong>. Los clientes asociados no se eliminarán, solo quedarán disponibles para ser asignados a otras rutas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar Ruta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
