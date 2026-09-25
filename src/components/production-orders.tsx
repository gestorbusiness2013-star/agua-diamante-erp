'use client';

import { useState, useEffect } from 'react';
import { ProductionLine } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, MoreHorizontal, Ban, Wrench, Plus, CheckCircle2 } from "lucide-react";
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface ProductionOrdersProps {
    lines: ProductionLine[];
    setLines: (lines: ProductionLine[]) => Promise<void>;
}

export function ProductionOrders({ lines, setLines }: ProductionOrdersProps) {
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const activeOrders = lines.filter(line => line.status === 'Activa' && line.targetQuantity && line.targetQuantity > 0);
    const [etas, setEtas] = useState<Record<number, string>>({});

    // State for registering produced progress
    const [progressDialogOpen, setProgressDialogOpen] = useState(false);
    const [lineForProgress, setLineForProgress] = useState<ProductionLine | null>(null);
    const [unitsToAdd, setUnitsToAdd] = useState<number>(50);

    const calculateProgress = (produced: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(100, Math.round((produced / target) * 100));
    };
    
    useEffect(() => {
        const calculateAllEtas = () => {
            const newEtas: Record<number, string> = {};
            activeOrders.forEach(line => {
                if (!line.targetQuantity || line.outputPerHour <= 0) {
                    newEtas[line.id] = 'N/A';
                    return;
                }
                const remaining = line.targetQuantity - (line.producedQuantity || 0);
                if (remaining <= 0) {
                    newEtas[line.id] = 'Completado';
                    return;
                }
                
                const hoursNeeded = remaining / line.outputPerHour;
                const etaDate = addHours(new Date(), hoursNeeded);
                newEtas[line.id] = format(etaDate, "dd/MM HH:mm", { locale: es });
            });
            setEtas(newEtas);
        };
        
        calculateAllEtas();
        const intervalId = setInterval(calculateAllEtas, 60000);
        return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(activeOrders)]);

    const getEtaForLine = (line: ProductionLine) => {
        return etas[line.id] || 'Calculando...';
    };

    const handleOpenProgress = (line: ProductionLine) => {
        setLineForProgress(line);
        const remaining = Math.max(1, (line.targetQuantity || 0) - (line.producedQuantity || 0));
        setUnitsToAdd(remaining > 50 ? 50 : remaining);
        setProgressDialogOpen(true);
    };

    const handleSaveProgress = () => {
        if (!lineForProgress) return;
        const add = Number(unitsToAdd) || 0;
        if (add <= 0) return;

        const newLines = lines.map(line => {
            if (line.id === lineForProgress.id) {
                const currentProduced = line.producedQuantity || 0;
                return {
                    ...line,
                    producedQuantity: currentProduced + add,
                };
            }
            return line;
        });

        setLines(newLines);
        setProgressDialogOpen(false);
        setLineForProgress(null);
    };

    const handleUpdateOrderStatus = (lineId: number, newStatus: 'Inactiva' | 'En Mantenimiento') => {
        const newLines = lines.map(line => {
            if (line.id === lineId) {
                return {
                    ...line,
                    status: newStatus,
                    currentProduct: 'N/A',
                    outputPerHour: 0,
                    targetQuantity: null,
                    producedQuantity: null,
                    orderStartDate: null,
                    maintenanceDate: newStatus === 'En Mantenimiento' ? new Date() : null,
                };
            }
            return line;
        });
        setLines(newLines);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageCheck className="h-6 w-6 text-primary"/>
                        Órdenes de Producción Activas
                    </CardTitle>
                    <CardDescription>Seguimiento en tiempo real de las órdenes de producción en curso.</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay órdenes de producción activas en este momento.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Línea</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Progreso</TableHead>
                                    <TableHead className="text-right hidden sm:table-cell">Producido / Objetivo</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">ETA</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeOrders.map((line) => {
                                    const progress = calculateProgress(line.producedQuantity || 0, line.targetQuantity || 0);
                                    const eta = getEtaForLine(line);
                                    const isComplete = (line.producedQuantity || 0) >= (line.targetQuantity || 0);

                                    return (
                                    <TableRow 
                                        key={line.id}
                                        onClick={() => setSelectedRowId(line.id)}
                                        data-state={selectedRowId === line.id ? 'selected' : undefined}
                                        className="cursor-pointer"
                                    >
                                        <TableCell>
                                            <div className="font-medium">{line.name}</div>
                                            <Badge variant="outline" className="mt-1 md:hidden">
                                                ETA: {eta}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{line.currentProduct}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Progress value={progress} className="w-24 h-2.5" />
                                                <span className="text-xs font-semibold">{progress}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right hidden sm:table-cell">
                                            <span className="font-mono font-medium">{(line.producedQuantity || 0).toLocaleString('es-ES')}</span>
                                            <span className="text-muted-foreground"> / {(line.targetQuantity || 0).toLocaleString('es-ES')}</span>
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">
                                            {isComplete ? (
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                                                    Listo
                                                </Badge>
                                            ) : eta}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-8 gap-1 text-xs"
                                                    title="Registrar avance de producción"
                                                    onClick={() => handleOpenProgress(line)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Avance</span>
                                                </Button>

                                                {isComplete && (
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                        title="Finalizar orden completada"
                                                        onClick={() => handleUpdateOrderStatus(line.id, 'Inactiva')}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Finalizar</span>
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones de Orden</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleOpenProgress(line)}>
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Registrar Unidades Fabricadas
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleUpdateOrderStatus(line.id, 'Inactiva')}>
                                                            <Ban className="mr-2 h-4 w-4" />
                                                            Finalizar Orden Actual
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateOrderStatus(line.id, 'En Mantenimiento')}>
                                                            <Wrench className="mr-2 h-4 w-4" />
                                                            Enviar a Mantenimiento
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modal para Registrar Avance de Producción */}
            <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Avance en {lineForProgress?.name}</DialogTitle>
                        <DialogDescription>
                            Suma unidades producidas a la orden activa de <strong>{lineForProgress?.currentProduct}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {lineForProgress && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-muted/60 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Progreso Actual:</span>
                                    <span className="font-semibold">
                                        {(lineForProgress.producedQuantity || 0).toLocaleString('es-ES')} / {(lineForProgress.targetQuantity || 0).toLocaleString('es-ES')} unid.
                                    </span>
                                </div>
                                <Progress value={calculateProgress(lineForProgress.producedQuantity || 0, lineForProgress.targetQuantity || 0)} className="h-2 mt-2" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="units-to-add">Unidades a Sumar</Label>
                                <Input 
                                    id="units-to-add"
                                    type="number"
                                    min="1"
                                    value={unitsToAdd}
                                    onChange={(e) => setUnitsToAdd(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveProgress} className="bg-primary">
                            Guardar Avance
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
