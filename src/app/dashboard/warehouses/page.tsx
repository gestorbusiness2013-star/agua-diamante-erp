

'use client';

import { useState } from "react";
import { useInventory } from "@/context/inventory-context";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Truck, Edit, Trash2, ShoppingBag, Send } from "lucide-react";
import { WarehouseForm, type WarehouseFormValues } from "@/components/warehouse-form";
import { TransferForm, type TransferFormValues } from "@/components/transfer-form";
import QRCode from 'qrcode';
import { QrScanner } from "@/components/qr-scanner";
import { SaleForm, type SaleFormValues } from "@/components/sale-form";
import { StockRequestForm, type StockRequestFormValues } from "@/components/stock-request-form";
import { useToast } from "@/hooks/use-toast";
import type { Warehouse } from "@/lib/inventory-data";
import type jsPDF from "jspdf";
import { useAuth } from "@/context/auth-context";

// Extend the jspdf interface to include the `autoTable` method
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function WarehousesPage() {
    const { toast } = useToast();
    const { 
        warehouses,
        finishedProducts,
        customers,
        saveWarehouse,
        deleteWarehouse,
        transferProduct,
        createSaleOrder,
        createStockRequest,
    } = useInventory();
    
    const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<{warehouseId: string, productName: string} | null>(null);

    const { currentUser } = useAuth();

    const handleOpenWarehouseDialog = (warehouse?: Warehouse) => {
        if (warehouse) {
            setSelectedWarehouse(warehouse);
            setIsEditMode(true);
        } else {
            setSelectedWarehouse(null);
            setIsEditMode(false);
        }
        setWarehouseDialogOpen(true);
    };

    const handleCloseWarehouseDialog = () => {
        setWarehouseDialogOpen(false);
        setSelectedWarehouse(null);
    };
    
    const handleWarehouseSubmit = async (values: WarehouseFormValues) => {
        await saveWarehouse(values, isEditMode, selectedWarehouse);
        handleCloseWarehouseDialog();
    };

    const handleOpenDeleteDialog = (warehouse: Warehouse) => {
        if (warehouse.stock.length > 0) {
            toast({
                variant: "destructive",
                title: "Almacén no vacío",
                description: "No se puede eliminar un almacén que contiene stock.",
            });
            return;
        }
        setWarehouseToDelete(warehouse);
        setDeleteAlertOpen(true);
    };

    const handleDeleteWarehouse = async () => {
        if (warehouseToDelete) {
            await deleteWarehouse(warehouseToDelete);
            setDeleteAlertOpen(false);
            setWarehouseToDelete(null);
        }
    };
    
    const generateDeliveryNotePDF = async (data: TransferFormValues, transferId: string) => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const halfPage = pageHeight / 2;

        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(transferId, { margin: 1 });
        } catch (e) {
            console.error("QR Code Error:", e);
        }

        const drawContent = (yOffset: number, isCopy: boolean) => {
            const warehouseName = warehouses.find(w => String(w.id) === data.warehouseId)?.name || 'N/A';
            const sourceName = data.sourceId === 'factory' ? 'Fábrica' : (warehouses.find(w => String(w.id) === data.sourceId)?.name || 'N/A');
            const transferDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

            doc.setFontSize(20);
            doc.text("Nota de Entrega", margin, yOffset + 8);
            doc.setFontSize(11);
            doc.text(`Fecha: ${transferDate}`, pageWidth - margin, yOffset + 8, { align: 'right' });
            doc.text(`Origen: ${sourceName}`, margin, yOffset + 16);
            doc.text(`Destino: ${warehouseName}`, margin, yOffset + 24);
            doc.text(`Chófer: ${data.driverName} (${data.driverId})`, margin, yOffset + 32);
            doc.text(`Vehículo: ${data.vehicleBrand} (${data.vehiclePlate})`, pageWidth / 2, yOffset + 32);

            if (qrDataUrl) {
                doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 25, yOffset + 12, 25, 25);
                doc.setFontSize(7);
                doc.text("Escanea para recibir", pageWidth - margin - 12.5, yOffset + 39, { align: 'center' });
                doc.text(`CÓD: ${transferId}`, pageWidth - margin - 12.5, yOffset + 43, { align: 'center' });
            }

            doc.autoTable({
                startY: yOffset + 40,
                head: [['Producto', 'Cantidad']],
                body: [[data.productName, new Intl.NumberFormat('es-ES').format(data.quantity)]],
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                },
            });
            
            const finalY = (doc as any).lastAutoTable.finalY || yOffset + 60;

            doc.setFontSize(10);
            doc.text("Firma del Chófer: ________________________", margin, finalY + 20);
            doc.text("Firma de Recepción: _______________________", pageWidth - margin, finalY + 20, { align: 'right' });

            if (isCopy) {
                doc.saveGraphicsState();
                doc.setFontSize(100);
                doc.setTextColor(150); // Gray color
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
    };
    
    const handleTransferSubmit = async (values: TransferFormValues) => {
        if (!currentUser) return;
        const transferId = await transferProduct(values, currentUser);
        if (transferId) {
            await generateDeliveryNotePDF(values, transferId);
        }
        setTransferDialogOpen(false);
    };

    const handleSaleSubmit = async (values: SaleFormValues) => {
        if (!currentUser) return;
        await createSaleOrder(values, currentUser);
        setSaleDialogOpen(false);
    };

    const handleRequestSubmit = async (values: StockRequestFormValues) => {
        if (!currentUser) return;
        await createStockRequest(values, currentUser);
        setRequestDialogOpen(false);
    };

    const handleScanSuccess = async (decodedText: string) => {
        if (!currentUser) return;
        setScanDialogOpen(false);
        await receiveTransfer(decodedText, currentUser);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Gestión de Almacenes</CardTitle>
                            <CardDescription>
                                Administra tus almacenes, transfiere y vende productos terminados.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => handleOpenWarehouseDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Almacén
                            </Button>
                            <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
                                Escanear Recepción
                            </Button>
                            <Button variant="outline" onClick={() => setRequestDialogOpen(true)}>
                                <Send className="mr-2 h-4 w-4" />
                                Solicitar Stock
                            </Button>
                             <Button onClick={() => setTransferDialogOpen(true)}>
                                <Truck className="mr-2 h-4 w-4" />
                                Transferir Productos
                            </Button>
                            <Button onClick={() => setSaleDialogOpen(true)}>
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                Crear Orden de Venta
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                       {warehouses.map(warehouse => (
                           <AccordionItem value={`item-${warehouse.id}`} key={warehouse.id}>
                               <div className="flex items-center w-full">
                                   <AccordionTrigger className="flex-1 hover:no-underline">
                                       <span className="font-medium text-lg">{warehouse.name}</span>
                                   </AccordionTrigger>
                                   <div className="flex items-center gap-2 pr-4 shrink-0">
                                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenWarehouseDialog(warehouse)}>
                                           <Edit className="h-4 w-4" />
                                           <span className="sr-only">Editar nombre</span>
                                       </Button>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(warehouse)}>
                                           <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar almacén</span>
                                       </Button>
                                   </div>
                               </div>
                               <AccordionContent>
                                   {warehouse.stock.length > 0 ? (
                                       <Table>
                                           <TableHeader>
                                               <TableRow>
                                                   <TableHead>Producto</TableHead>
                                                   <TableHead className="text-right hidden sm:table-cell">Cantidad</TableHead>
                                               </TableRow>
                                           </TableHeader>
                                           <TableBody>
                                               {warehouse.stock.map(item => (
                                                   <TableRow 
                                                        key={item.productName}
                                                        onClick={() => setSelectedStockItem({ warehouseId: warehouse.id, productName: item.productName })}
                                                        data-state={selectedStockItem?.warehouseId === warehouse.id && selectedStockItem?.productName === item.productName ? 'selected' : undefined}
                                                        className="cursor-pointer"
                                                    >
                                                       <TableCell className="font-medium">
                                                            <div>
                                                                {item.productName}
                                                                <div className="text-sm text-muted-foreground sm:hidden">
                                                                    Cantidad: {new Intl.NumberFormat('es-ES').format(item.quantity)}
                                                                </div>
                                                            </div>
                                                       </TableCell>
                                                       <TableCell className="text-right hidden sm:table-cell">{new Intl.NumberFormat('es-ES').format(item.quantity)}</TableCell>
                                                   </TableRow>
                                               ))}
                                           </TableBody>
                                       </Table>
                                   ) : (
                                       <p className="text-sm text-muted-foreground px-4 py-2">Este almacén está vacío.</p>
                                   )}
                               </AccordionContent>
                           </AccordionItem>
                       ))}
                    </Accordion>
                </CardContent>
            </Card>

            <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Nombre del Almacén' : 'Añadir Nuevo Almacén'}</DialogTitle>
                    </DialogHeader>
                    <WarehouseForm 
                        initialData={selectedWarehouse}
                        onSubmit={handleWarehouseSubmit}
                        onClose={handleCloseWarehouseDialog}
                    />
                </DialogContent>
            </Dialog>

             <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transferir Productos y Generar Nota</DialogTitle>
                        <DialogDescription>
                           Completa los detalles para la transferencia y la nota de entrega.
                        </DialogDescription>
                    </DialogHeader>
                    <TransferForm
                        finishedProducts={finishedProducts.filter(p => p.quantity > 0)}
                        warehouses={warehouses}
                        onSubmit={handleTransferSubmit}
                        onClose={() => setTransferDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            
             <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Orden de Venta</DialogTitle>
                        <DialogDescription>
                           Completa los detalles para crear una nueva orden de venta pendiente.
                        </DialogDescription>
                    </DialogHeader>
                    <SaleForm
                        initialData={null}
                        warehouses={warehouses.filter(w => w.stock.length > 0)}
                        customers={customers}
                        onSubmit={handleSaleSubmit}
                        onClose={() => setSaleDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Solicitar Stock a Fábrica</DialogTitle>
                        <DialogDescription>
                           Completa los detalles de los productos que necesitas reponer en tu almacén.
                        </DialogDescription>
                    </DialogHeader>
                    <StockRequestForm
                        warehouses={warehouses}
                        onSubmit={handleRequestSubmit}
                        onClose={() => setRequestDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <DialogTitle>¿Estás seguro de eliminar el almacén?</DialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el almacén.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteWarehouse} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
