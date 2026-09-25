'use client';

import { useMemo, useState } from 'react';
import { ProductionLines } from "@/components/production-lines";
import { ProductionOrders } from "@/components/production-orders";
import { ProductionSimulator } from "@/components/production-simulator";
import { useInventory } from '@/context/inventory-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Button } from '@/components/ui/button';
import { Check, X, Factory, Trash2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { StockRequest } from '@/lib/inventory-data';

export default function ProductionPage() {
    const { 
        finishedProducts, 
        productionLines, 
        updateProductionLines, 
        movements, 
        stockRequests, 
        updateStockRequestStatus,
        deleteStockRequest 
    } = useInventory();
    
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'lines' | 'requests' | 'simulator'>('lines');
    
    // State for approving a stock request and creating a production order
    const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [targetLineId, setTargetLineId] = useState<number | null>(null);
    const [targetQuantity, setTargetQuantity] = useState<number>(0);
    const [targetOutputPerHour, setTargetOutputPerHour] = useState<number>(1000);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const finishedProductNames = finishedProducts.map(p => p.name);

    const historicalProductionData = useMemo(() => {
        const fabricationMovements = movements
            .filter(m => m.type === 'Fabricación')
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10)
            .map(m => ({
                timestamp: m.date.toISOString(),
                quantity: m.quantity
            }));
        
        if (fabricationMovements.length === 0) {
            return JSON.stringify(
                [
                    { "timestamp": new Date().toISOString(), "quantity": 0 }
                ],
                null, 2
            );
        }
        
        return JSON.stringify(fabricationMovements, null, 2);
    }, [movements]);

    const getStatusBadge = (status: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Completado') => {
        switch (status) {
            case 'Pendiente':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
            case 'Aprobado':
                return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
            case 'Rechazado':
                return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
            case 'Completado':
                return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100';
        }
    };

    const handleOpenApprovalDialog = (request: StockRequest) => {
        setSelectedRequest(request);
        setTargetQuantity(request.quantity);
        
        // Auto-select the first inactive line, or the first line available
        const availableLine = productionLines.find(l => l.status === 'Inactiva') || productionLines[0];
        if (availableLine) {
            setTargetLineId(availableLine.id);
            setTargetOutputPerHour(availableLine.outputPerHour > 0 ? availableLine.outputPerHour : 1000);
        }
        setApprovalDialogOpen(true);
    };

    const handleLineChange = (lineIdStr: string) => {
        const lineId = Number(lineIdStr);
        setTargetLineId(lineId);
        const line = productionLines.find(l => l.id === lineId);
        if (line && line.outputPerHour > 0) {
            setTargetOutputPerHour(line.outputPerHour);
        }
    };

    const handleConfirmApproval = async () => {
        if (!selectedRequest || !targetLineId) return;
        setIsSubmitting(true);
        try {
            const chosenLine = productionLines.find(l => l.id === targetLineId);
            if (!chosenLine) throw new Error("Línea de producción no encontrada");

            // 1. Assign to the chosen production line and make it Active
            const updatedLines = productionLines.map(line => {
                if (line.id === targetLineId) {
                    return {
                        ...line,
                        status: 'Activa' as const,
                        currentProduct: selectedRequest.productName,
                        targetQuantity: Number(targetQuantity) || selectedRequest.quantity,
                        producedQuantity: 0,
                        outputPerHour: Number(targetOutputPerHour) || chosenLine.outputPerHour || 1000,
                        maintenanceDate: null,
                        orderStartDate: new Date(),
                    };
                }
                return line;
            });

            await updateProductionLines(updatedLines);

            // 2. Mark request as Aprobado
            await updateStockRequestStatus(selectedRequest.id, 'Aprobado');

            toast({
                title: "Orden de Producción Creada",
                description: `Se aprobó la solicitud de ${selectedRequest.warehouseName} y se asignó a ${chosenLine.name} (${Number(targetQuantity) || selectedRequest.quantity} unid.).`,
            });

            setApprovalDialogOpen(false);
            setSelectedRequest(null);
            // Switch tab to Lines and Orders so user immediately sees the active production
            setActiveTab('lines');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al crear orden",
                description: error.message || "Ocurrió un error inesperado",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDirectApproveOnly = async () => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            await updateStockRequestStatus(selectedRequest.id, 'Aprobado');
            toast({
                title: "Solicitud Aprobada",
                description: `La solicitud de ${selectedRequest.warehouseName} ha sido aprobada.`,
            });
            setApprovalDialogOpen(false);
            setSelectedRequest(null);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="lines">Líneas y Órdenes</TabsTrigger>
                    <TabsTrigger value="requests">
                        Solicitudes de Stock
                        {stockRequests.filter(r => r.status === 'Pendiente').length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 font-semibold px-1.5 py-0 text-xs">
                                {stockRequests.filter(r => r.status === 'Pendiente').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="simulator">Simulador IA</TabsTrigger>
                </TabsList>
                <TabsContent value="lines" className="space-y-8">
                     <ProductionLines lines={productionLines} setLines={updateProductionLines} finishedProducts={finishedProductNames} />
                     <ProductionOrders lines={productionLines} setLines={updateProductionLines} />
                </TabsContent>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Solicitudes de Stock de Almacenes</CardTitle>
                            <CardDescription>Revisa, aprueba y asigna directamente a producción las solicitudes de reposición enviadas por los almacenes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Almacén</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                No hay solicitudes de stock registradas.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        stockRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">{request.warehouseName}</TableCell>
                                                <TableCell>{request.productName}</TableCell>
                                                <TableCell className="text-right">{request.quantity.toLocaleString('es-ES')}</TableCell>
                                                <TableCell>{format(request.date, "dd/MM/yyyy", { locale: es })}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusBadge(request.status)}>{request.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {request.status === 'Pendiente' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Button 
                                                                size="sm" 
                                                                className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
                                                                title="Aprobar solicitud y crear orden de producción"
                                                                onClick={() => handleOpenApprovalDialog(request)}
                                                            >
                                                                <Factory className="h-3.5 w-3.5" />
                                                                <span className="text-xs">Aprobar y Fabricar</span>
                                                            </Button>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="icon" 
                                                                className="h-8 w-8"
                                                                title="Rechazar solicitud"
                                                                onClick={() => updateStockRequestStatus(request.id, 'Rechazado')}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : request.status === 'Aprobado' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-8 gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                                                                title="Crear o asignar orden de producción en línea"
                                                                onClick={() => handleOpenApprovalDialog(request)}
                                                            >
                                                                <Factory className="h-3.5 w-3.5" />
                                                                <span className="text-xs">Crear Orden</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-xs text-muted-foreground hover:text-green-600"
                                                                title="Marcar como Completado"
                                                                onClick={() => updateStockRequestStatus(request.id, 'Completado')}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                                Completar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                title="Eliminar solicitud"
                                                                onClick={() => deleteStockRequest(request.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Procesada</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                title="Eliminar registro"
                                                                onClick={() => deleteStockRequest(request.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="simulator">
                    <ProductionSimulator historicalData={historicalProductionData} />
                </TabsContent>
            </Tabs>

            {/* Modal para Aprobar y Crear Orden de Producción */}
            <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline text-lg">
                            <Factory className="h-5 w-5 text-primary" />
                            Aprobar y Crear Orden de Producción
                        </DialogTitle>
                        <DialogDescription>
                            Asigna la solicitud de reposición a una línea de producción activa para iniciar la fabricación.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/60 rounded-lg border text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground block font-medium">Almacén Destino</span>
                                    <span className="font-semibold text-foreground">{selectedRequest.warehouseName}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block font-medium">Producto a Fabricar</span>
                                    <span className="font-semibold text-foreground">{selectedRequest.productName}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="line-select">Línea de Producción</Label>
                                <Select 
                                    value={targetLineId ? String(targetLineId) : undefined} 
                                    onValueChange={handleLineChange}
                                >
                                    <SelectTrigger id="line-select">
                                        <SelectValue placeholder="Seleccione una línea" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productionLines.map(line => {
                                            const isAvailable = line.status === 'Inactiva';
                                            return (
                                                <SelectItem key={line.id} value={String(line.id)}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="font-medium">{line.name}</span>
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded font-normal",
                                                            isAvailable ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-medium" :
                                                            line.status === 'Activa' ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                                                            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                        )}>
                                                            {isAvailable ? 'Disponible' : `${line.status}: ${line.currentProduct || 'En curso'}`}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {targetLineId && productionLines.find(l => l.id === targetLineId)?.status === 'Activa' && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        ⚠️ Esta línea ya tiene una orden activa. Asignar esta orden la sustituirá.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity-input">Cantidad Objetivo</Label>
                                    <Input 
                                        id="quantity-input"
                                        type="number"
                                        min="1"
                                        value={targetQuantity}
                                        onChange={(e) => setTargetQuantity(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="output-input">Rendimiento (unid/hora)</Label>
                                    <Input 
                                        id="output-input"
                                        type="number"
                                        min="1"
                                        value={targetOutputPerHour}
                                        onChange={(e) => setTargetOutputPerHour(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleDirectApproveOnly} 
                            disabled={isSubmitting}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Solo Aprobar (Sin Orden)
                        </Button>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setApprovalDialogOpen(false)} 
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleConfirmApproval} 
                                disabled={isSubmitting || !targetLineId} 
                                className="bg-primary"
                            >
                                <Factory className="mr-2 h-4 w-4" />
                                {isSubmitting ? 'Creando...' : 'Aprobar y Crear Orden'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
