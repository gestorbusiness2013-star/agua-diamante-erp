
'use client';

import { useMemo } from 'react';
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
import { Check, X } from 'lucide-react';

export default function ProductionPage() {
    const { finishedProducts, productionLines, updateProductionLines, movements, stockRequests, updateStockRequestStatus } = useInventory();
    
    const finishedProductNames = finishedProducts.map(p => p.name);

    const historicalProductionData = useMemo(() => {
        const fabricationMovements = movements
            .filter(m => m.type === 'Fabricación')
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10) // Limit to the last 10 for brevity
            .map(m => ({
                timestamp: m.date.toISOString(),
                quantity: m.quantity
            }));
        
        // If there are no movements, provide a default example structure.
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


    return (
        <Tabs defaultValue="lines" className="space-y-4">
            <TabsList>
                <TabsTrigger value="lines">Líneas y Órdenes</TabsTrigger>
                <TabsTrigger value="requests">Solicitudes de Stock</TabsTrigger>
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
                        <CardDescription>Revisa y aprueba las solicitudes de reposición de stock enviadas por los almacenes.</CardDescription>
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
                                {stockRequests.map((request) => (
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
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Aprobar solicitud"
                                                        onClick={() => updateStockRequestStatus(request.id, 'Aprobado')}
                                                    >
                                                        <Check className="h-4 w-4" />
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
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Procesada</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="simulator">
                <ProductionSimulator historicalData={historicalProductionData} />
            </TabsContent>
        </Tabs>
    );
}
