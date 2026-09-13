
'use client';

import { useState } from "react";
import { MoreHorizontal, PlusCircle, AreaChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useInventory } from "@/context/inventory-context";
import { MarketProductForm, type MarketProductFormValues } from "@/components/market-product-form";
import type { MarketProduct } from "@/lib/customers-data";

export default function MarketAnalysisPage() {
    const { marketProducts, saveMarketProduct, deleteMarketProduct } = useInventory();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
    const [productToDelete, setProductToDelete] = useState<MarketProduct | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const handleOpenDialog = (product?: MarketProduct) => {
        setSelectedProduct(product || null);
        setIsEditMode(!!product);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedProduct(null);
    };

    const handleSubmit = async (values: MarketProductFormValues) => {
        await saveMarketProduct(values, isEditMode ? selectedProduct?.id : undefined);
        handleCloseDialog();
    };

    const handleOpenDeleteDialog = (product: MarketProduct) => {
        setProductToDelete(product);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (productToDelete) {
            await deleteMarketProduct(productToDelete.id);
            setDeleteAlertOpen(false);
            setProductToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2"><AreaChart />Gestión de Productos de Mercado</CardTitle>
                            <CardDescription>
                                Define los productos de la competencia que quieres rastrear en las encuestas de clientes.
                            </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Producto
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Producto</TableHead>
                                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                <TableHead>
                                    <span className="sr-only">Acciones</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {marketProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        {product.name}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{product.description}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(product)}>Editar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(product)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Producto de Mercado' : 'Crear Nuevo Producto de Mercado'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Actualiza los detalles del producto.' : 'Añade un nuevo producto para rastrear.'}
                        </DialogDescription>
                    </DialogHeader>
                    <MarketProductForm
                        initialData={selectedProduct}
                        onSubmit={handleSubmit}
                        onClose={handleCloseDialog}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el producto de la lista.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
