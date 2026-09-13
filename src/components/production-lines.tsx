
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, Power, PowerOff, Wrench, MoreHorizontal, Truck, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { ProductionLine } from '@/lib/data';
import { ScheduleMaintenanceForm, type ScheduleMaintenanceValues } from './schedule-maintenance-form';
import { ProductionOrderForm, type ProductionOrderValues } from './production-order-form';


const statusConfig: { [key in ProductionLine['status']]: { icon: React.ReactNode; badgeClass: string; } } = {
    Activa: {
        icon: <Power className="h-4 w-4 text-green-600" />,
        badgeClass: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    },
    Inactiva: {
        icon: <PowerOff className="h-4 w-4 text-muted-foreground" />,
        badgeClass: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
    },
    'En Mantenimiento': {
        icon: <Wrench className="h-4 w-4 text-yellow-600" />,
        badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    }
};

interface ProductionLinesProps {
    lines: ProductionLine[];
    setLines: (lines: ProductionLine[]) => Promise<void>;
    finishedProducts: string[];
}

export function ProductionLines({ lines, setLines, finishedProducts }: ProductionLinesProps) {
    const [dialogState, setDialogState] = useState<{
        type: 'status' | 'maintenance' | 'order' | null;
        line: ProductionLine | null;
    }>({ type: null, line: null });

    const [newStatus, setNewStatus] = useState<ProductionLine['status']>('Activa');

    const handleOpenDialog = (type: 'status' | 'maintenance' | 'order', line: ProductionLine) => {
        setDialogState({ type, line });
        if (type === 'status') {
            setNewStatus(line.status);
        }
    };

    const handleCloseDialog = () => {
        setDialogState({ type: null, line: null });
    };

    const handleStatusChange = () => {
        if (!dialogState.line) return;

        const updatedLines = lines.map(l => {
             if (l.id !== dialogState.line!.id) return l;

            const isStoppingProduction = newStatus === 'Inactiva' || newStatus === 'En Mantenimiento';

            return {
                ...l,
                status: newStatus,
                currentProduct: isStoppingProduction ? 'N/A' : l.currentProduct,
                outputPerHour: isStoppingProduction ? 0 : l.outputPerHour,
                targetQuantity: isStoppingProduction ? null : l.targetQuantity,
                producedQuantity: isStoppingProduction ? null : l.producedQuantity,
                orderStartDate: isStoppingProduction ? null : l.orderStartDate,
            };
        });
        setLines(updatedLines);
        handleCloseDialog();
    };

    const handleFinalizeOrder = (lineId: number) => {
        const updatedLines = lines.map(l => {
            if (l.id !== lineId) return l;
            return {
                ...l,
                status: 'Inactiva' as const,
                currentProduct: 'N/A',
                outputPerHour: 0,
                targetQuantity: null,
                producedQuantity: null,
                orderStartDate: null,
            };
        });
        setLines(updatedLines);
    };

    const handleScheduleMaintenance = (values: ScheduleMaintenanceValues) => {
        if (!dialogState.line) return;

        const updatedLines = lines.map(l =>
            l.id === dialogState.line!.id ? { ...l, status: 'En Mantenimiento' as const, maintenanceDate: values.maintenanceDate, currentProduct: 'N/A', outputPerHour: 0, targetQuantity: null, producedQuantity: null, orderStartDate: null } : l
        );
        setLines(updatedLines);
        handleCloseDialog();
    };

    const handleCreateOrder = (values: ProductionOrderValues) => {
        if (!dialogState.line) return;

        const updatedLines = lines.map(l =>
            l.id === dialogState.line!.id ? { ...l, status: 'Activa' as const, ...values, maintenanceDate: null, producedQuantity: 0, orderStartDate: new Date() } : l
        );
        setLines(updatedLines);
        handleCloseDialog();
    };

    return (
        <>
            <section className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight font-headline">Líneas de Producción</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {lines.map((line) => {
                        const config = statusConfig[line.status];
                        return (
                            <Card key={line.id}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                    <div className='space-y-1'>
                                        <CardTitle className="text-base font-medium">{line.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {config.icon}
                                            <Badge variant="outline" className={cn("capitalize", config.badgeClass)}>{line.status}</Badge>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenDialog('status', line)}>Cambiar Estado Manual</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenDialog('maintenance', line)}>Planificar Mantenimiento</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {line.status === 'Activa' && (
                                                <DropdownMenuItem onClick={() => handleFinalizeOrder(line.id)}>
                                                    <Ban className="mr-2 h-4 w-4" />
                                                    <span>Finalizar Orden Actual</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleOpenDialog('order', line)}>
                                                <Truck className="mr-2 h-4 w-4" />
                                                <span>{line.status === 'Activa' ? 'Modificar Orden' : 'Crear Orden'}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Producto</p>
                                        <p className="font-semibold">{line.currentProduct}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Rendimiento</p>
                                        <p className="font-semibold">{line.outputPerHour.toLocaleString('es-ES')} unidades/hora</p>
                                    </div>
                                    {line.status === 'En Mantenimiento' && line.maintenanceDate && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Próximo Mantenimiento</p>
                                            <p className="font-semibold">{format(line.maintenanceDate, "PPP", { locale: es })}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </section>

            {/* Change Status Dialog */}
            <Dialog open={dialogState.type === 'status'} onOpenChange={handleCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cambiar Estado de {dialogState.line?.name}</DialogTitle>
                        <DialogDescription>
                            Selecciona el nuevo estado para la línea de producción.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="status-select">Estado</Label>
                        <Select value={newStatus} onValueChange={(value: ProductionLine['status']) => setNewStatus(value)}>
                            <SelectTrigger id="status-select">
                                <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Activa">Activa</SelectItem>
                                <SelectItem value="Inactiva">Inactiva</SelectItem>
                                <SelectItem value="En Mantenimiento">En Mantenimiento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                        <Button onClick={handleStatusChange}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule Maintenance Dialog */}
            <Dialog open={dialogState.type === 'maintenance'} onOpenChange={handleCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Planificar Mantenimiento para {dialogState.line?.name}</DialogTitle>
                        <DialogDescription>
                            Selecciona una fecha para el próximo mantenimiento. Esto cambiará el estado de la línea a 'En Mantenimiento'.
                        </DialogDescription>
                    </DialogHeader>
                    <ScheduleMaintenanceForm onSubmit={handleScheduleMaintenance} onClose={handleCloseDialog} />
                </DialogContent>
            </Dialog>

            {/* Create Production Order Dialog */}
            <Dialog open={dialogState.type === 'order'} onOpenChange={handleCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Orden de Producción en {dialogState.line?.name}</DialogTitle>
                        <DialogDescription>
                            Especifica los detalles de la producción. Esto cambiará el estado de la línea a 'Activa'.
                        </DialogDescription>
                    </DialogHeader>
                    <ProductionOrderForm
                        initialData={dialogState.line}
                        onSubmit={handleCreateOrder}
                        onClose={handleCloseDialog}
                        finishedProducts={finishedProducts}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
