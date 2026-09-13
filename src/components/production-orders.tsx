
'use client';

import { useState, useEffect } from 'react';
import { ProductionLine } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, MoreHorizontal, Ban, Wrench } from "lucide-react";
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';

interface ProductionOrdersProps {
    lines: ProductionLine[];
    setLines: (lines: ProductionLine[]) => Promise<void>;
}

export function ProductionOrders({ lines, setLines }: ProductionOrdersProps) {
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const activeOrders = lines.filter(line => line.status === 'Activa' && line.targetQuantity && line.targetQuantity > 0);
    const [etas, setEtas] = useState<Record<number, string>>({});

    const calculateProgress = (produced: number, target: number) => {
        if (target === 0) return 0;
        return Math.round((produced / target) * 100);
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="h-6 w-6"/>
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
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeOrders.map((line) => {
                                const progress = calculateProgress(line.producedQuantity || 0, line.targetQuantity || 0);
                                const eta = getEtaForLine(line);
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
                                    <TableCell>{line.currentProduct}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Progress value={progress} className="w-24 h-2.5" />
                                            <span>{progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right hidden sm:table-cell">
                                        {(line.producedQuantity || 0).toLocaleString('es-ES')} / {(line.targetQuantity || 0).toLocaleString('es-ES')}
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">{eta}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuLabel>Acciones de Orden</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleUpdateOrderStatus(line.id, 'Inactiva')}>
                                                    <Ban className="mr-2 h-4 w-4" />
                                                    Finalizar Orden
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateOrderStatus(line.id, 'En Mantenimiento')}>
                                                    <Wrench className="mr-2 h-4 w-4" />
                                                    Enviar a Mantenimiento
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
