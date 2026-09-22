
'use client';

import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

export default function MovementsPage() {
    const { movements } = useInventory();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const sortedMovements = useMemo(() => {
        // Filter out any movements that don't have a valid date to prevent crashes.
        return [...movements]
            .filter(movement => movement.date instanceof Date && !isNaN(movement.date.getTime()))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [movements]);


    const getStatusVariant = (status?: 'Pendiente' | 'Completado' | 'Cancelado') => {
        if (status === 'Cancelado') return 'destructive';
        if (status === 'Completado') return 'secondary';
        if (status === 'Pendiente') return 'outline';
        return 'outline';
    };

    const getTypeBadgeVariant = (type: 'Fabricación' | 'Transferencia' | 'Venta' | 'Anulación de Venta') => {
        switch (type) {
            case 'Fabricación': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Transferencia': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Venta': return 'bg-green-100 text-green-800 border-green-200';
            case 'Anulación de Venta': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'outline';
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Registro de Movimientos</CardTitle>
                <CardDescription>
                    Historial de todas las fabricaciones, transferencias, ventas y anulaciones de productos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha y Hora</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="hidden sm:table-cell text-right">Cantidad</TableHead>
                            <TableHead className="hidden md:table-cell">Tipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="hidden md:table-cell">Usuario</TableHead>
                            <TableHead>Detalles</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedMovements.map((movement) => (
                            <TableRow 
                                key={movement.id}
                                className={cn(movement.status === 'Cancelado' && 'text-muted-foreground line-through')}
                            >
                                <TableCell>
                                    <div className="font-medium">
                                        {isClient ? format(movement.date, "dd/MM/yyyy HH:mm", { locale: es }) : <div className="h-5 w-28 bg-muted rounded" />}
                                    </div>
                                    <div className="text-sm md:hidden">
                                        {movement.user}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        {movement.productName}
                                        <div className="text-sm sm:hidden">
                                            Cant: {movement.quantity.toLocaleString('es-ES')}
                                        </div>
                                         <div className="text-sm md:hidden">
                                            <Badge variant={'secondary'} className={cn('mt-1', getTypeBadgeVariant(movement.type))}>{movement.type}</Badge>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-right">{movement.quantity.toLocaleString('es-ES')}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Badge variant={'secondary'} className={getTypeBadgeVariant(movement.type)}>{movement.type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(movement.status)}>
                                        {movement.status || 'Completado'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{movement.user}</TableCell>
                                <TableCell>{movement.details}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
