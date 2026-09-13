'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, ShoppingCart } from 'lucide-react';
import { useInventory } from '@/context/inventory-context';
import type { PurchaseOrder } from '@/lib/purchases-data';
import { PurchaseOrderForm, type PurchaseOrderFormValues } from '@/components/purchase-order-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { cn } from '@/lib/utils';

export default function ComprasPage() {
    const { purchaseOrders, savePurchaseOrder, suppliers, inventoryItems, receivePurchaseOrder, cancelPurchaseOrder } = useInventory();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; type: 'receive' | 'cancel'; order: PurchaseOrder | null }>({ open: false, type: 'receive', order: null });
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const handleOpenDialog = (order?: PurchaseOrder) => {
        setSelectedOrder(order || null);
        setIsEditMode(!!order);
        setDialogOpen(true);
    };

    const handleCloseDialogs = () => {
        setDialogOpen(false);
        setAlertDialog({ open: false, type: 'receive', order: null });
        setSelectedOrder(null);
    };

    const getStatusBadge = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Pendiente': return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case 'Recibido': return "bg-green-100 text-green-800 border-green-200";
            case 'Cancelado': return "bg-red-100 text-red-800 border-red-200";
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline flex items-center gap-2"><ShoppingCart /> Órdenes de Compra</CardTitle>
                        <CardDescription>Gestiona las solicitudes de materia prima a proveedores.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nueva Orden</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Nº Orden</TableHead><TableHead>Proveedor</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {purchaseOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell><div className="font-medium">{order.orderNumber}</div><div className="text-xs text-muted-foreground">{format(order.date, "dd/MM/yyyy")}</div></TableCell>
                                    <TableCell>{order.supplierName}</TableCell>
                                    <TableCell className="text-right font-mono">${(order.totalAmount ?? 0).toFixed(2)}</TableCell>
                                    <TableCell><Badge variant="outline" className={getStatusBadge(order.status)}>{order.status}</Badge></TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {order.status === 'Pendiente' && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'receive', order })}>Registrar Recepción</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleOpenDialog(order)}>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setAlertDialog({ open: true, type: 'cancel', order })} className="text-destructive">Anular</DropdownMenuItem>
                                                    </>
                                                )}
                                                {order.status !== 'Pendiente' && <DropdownMenuItem disabled>Completada</DropdownMenuItem>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Nueva'} Orden</DialogTitle></DialogHeader>
                    <PurchaseOrderForm initialData={selectedOrder} suppliers={suppliers} materials={inventoryItems} onSubmit={async (v) => { await savePurchaseOrder(v, isEditMode, selectedOrder); handleCloseDialogs(); }} onClose={handleCloseDialogs} />
                </DialogContent>
            </Dialog>
            <AlertDialog open={alertDialog.open} onOpenChange={(o) => setAlertDialog(prev => ({ ...prev, open: o }))}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar acción?</AlertDialogTitle><AlertDialogDescription>{alertDialog.type === 'receive' ? 'Esto sumará los materiales al inventario.' : 'Esto anulará la orden de compra.'}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={handleCloseDialogs}>Volver</AlertDialogCancel><AlertDialogAction onClick={async () => { if (alertDialog.order) { if (alertDialog.type === 'receive') await receivePurchaseOrder(alertDialog.order); else await cancelPurchaseOrder(alertDialog.order); } handleCloseDialogs(); }}>Confirmar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
