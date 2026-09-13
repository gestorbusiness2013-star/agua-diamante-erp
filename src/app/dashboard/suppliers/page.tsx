
'use client';

import { useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";
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
import type { Supplier } from "@/lib/suppliers-data";
import { SupplierForm, type SupplierFormValues } from "@/components/supplier-form";

export default function SuppliersPage() {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInventory();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const handleOpenDialog = (supplier?: Supplier) => {
        if (supplier) {
            setSelectedSupplier(supplier);
            setIsEditMode(true);
        } else {
            setSelectedSupplier(null);
            setIsEditMode(false);
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedSupplier(null);
    };

    const handleSubmit = async (values: SupplierFormValues) => {
        if (isEditMode && selectedSupplier) {
            await updateSupplier({ ...selectedSupplier, ...values });
        } else {
            await addSupplier(values);
        }
        handleCloseDialog();
    };

    const handleOpenDeleteDialog = (supplier: Supplier) => {
        setSupplierToDelete(supplier);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (supplierToDelete) {
            await deleteSupplier(supplierToDelete.id);
            setDeleteAlertOpen(false);
            setSupplierToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Gestión de Proveedores</CardTitle>
                            <CardDescription>
                                Añade, edita y gestiona la información de tus proveedores.
                            </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Proveedor
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Proveedor</TableHead>
                                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                                <TableHead>
                                    <span className="sr-only">Acciones</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.map((supplier) => (
                                <TableRow key={supplier.id} className="cursor-pointer" onClick={() => handleOpenDialog(supplier)}>
                                    <TableCell className="font-medium">
                                        <div>
                                            {supplier.name}
                                            <div className="text-muted-foreground text-xs md:hidden">{supplier.contactPerson}</div>
                                            <div className="text-muted-foreground text-xs sm:hidden">{supplier.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div>
                                            <p>{supplier.contactPerson}</p>
                                            <p className="text-xs text-muted-foreground">{supplier.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{supplier.phone}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(supplier)}>Editar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(supplier)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Proveedor' : 'Crear Nuevo Proveedor'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Actualiza los detalles del proveedor.' : 'Rellena los detalles para añadir un nuevo proveedor.'}
                        </DialogDescription>
                    </DialogHeader>
                    <SupplierForm
                        initialData={selectedSupplier}
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
                        Esta acción no se puede deshacer. Esto eliminará permanentemente al proveedor.
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
