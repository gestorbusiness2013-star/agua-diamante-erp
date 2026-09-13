
'use client';

import { useState } from "react";
import { MoreHorizontal, PlusCircle, PackagePlus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialForm, type MaterialFormValues } from "@/components/material-form";
import { FabricationForm, type FabricationFormValues } from "@/components/fabrication-form";
import { RecipeForm, type RecipeFormValues } from "@/components/recipe-form";
import { TransferForm, type TransferFormValues } from "@/components/transfer-form";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, FinishedProduct } from "@/lib/inventory-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
    const { toast } = useToast();
    const { 
        inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
        finishedProducts,
        recipes,
        warehouses,
        fabricateProduct,
        saveRecipeAndProduct,
        deleteRecipeAndProduct,
        transferProduct,
        suppliers,
    } = useInventory();
    const { currentUser } = useAuth();

    const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
    const [fabricationDialogOpen, setFabricationDialogOpen] = useState(false);
    const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [productDeleteAlertOpen, setProductDeleteAlertOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [productToDelete, setProductToDelete] = useState<FinishedProduct | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [deleteAccessKey, setDeleteAccessKey] = useState("");
    
    const [activeTab, setActiveTab] = useState("raw");

    const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string | null>(null);
    const [selectedFinishedProductId, setSelectedFinishedProductId] = useState<string | null>(null);
    
    if (!currentUser) {
        return null;
    }
    
    const canTransferStock = currentUser.role === 'Admin' || currentUser.role === 'Supervisor' || currentUser.role === 'Gerente de Planta' || (currentUser.permissions?.inventory ?? false);
    const canEditRecipes = currentUser.role === 'Admin' || currentUser.role === 'Supervisor' || currentUser.role === 'Gerente de Planta' || (currentUser.permissions?.inventory ?? false);

    const availableProductsToFabricate = Object.keys(recipes);
    const rawMaterialNames = inventoryItems.map(item => item.name);

    const handleOpenMaterialDialog = (item?: InventoryItem) => {
        if(item) {
            setSelectedItem(item);
            setIsEditMode(true);
        } else {
            setSelectedItem(null);
            setIsEditMode(false);
        }
        setMaterialDialogOpen(true);
    };

    const handleCloseMaterialDialog = () => {
        setMaterialDialogOpen(false);
        setSelectedItem(null);
    };

    const handleMaterialSubmit = async (values: MaterialFormValues) => {
        if (values.accessKey !== 'ADMIN123') {
            toast({
                variant: "destructive",
                title: "Error de Autenticación",
                description: "La clave de acceso es incorrecta.",
            });
            return;
        }
        
        let finalStatus = values.status;
        if (finalStatus !== 'Pedido') {
            finalStatus = values.quantity <= values.lowStockThreshold ? 'Stock Bajo' : 'En Stock';
        }
        
        const materialData = { ...values, status: finalStatus, supplierId: values.supplierId || undefined };

        if(isEditMode && selectedItem) {
            await updateInventoryItem({ 
                ...selectedItem, 
                ...materialData, 
            });
        } else {
            await addInventoryItem({
                ...materialData,
            });
        }
        handleCloseMaterialDialog();
    };

    const handleOpenDeleteDialog = (item: InventoryItem) => {
        setItemToDelete(item);
        setAlertDialogOpen(true);
    };

    const handleDelete = async () => {
        if(itemToDelete) {
            await deleteInventoryItem(itemToDelete.id);
            setAlertDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const handleFabricateSubmit = async (values: FabricationFormValues) => {
        await fabricateProduct(values, currentUser);
        setFabricationDialogOpen(false);
    };

    const handleOpenRecipeDialog = (product?: FinishedProduct) => {
        if(product) {
            setSelectedProduct(product);
            setIsEditMode(true);
        } else {
            setSelectedProduct(null);
            setIsEditMode(false);
        }
        setRecipeDialogOpen(true);
    };

    const handleCloseRecipeDialog = () => {
        setRecipeDialogOpen(false);
        setSelectedProduct(null);
    };

    const handleRecipeSubmit = async (values: RecipeFormValues) => {
        if (values.accessKey !== 'ADMIN123') {
            toast({
                variant: "destructive",
                title: "Error de Autenticación",
                description: "La clave de acceso es incorrecta.",
            });
            return;
        }
        await saveRecipeAndProduct(values, isEditMode, selectedProduct);
        handleCloseRecipeDialog();
    };
    
    const handleOpenDeleteProductDialog = (product: FinishedProduct) => {
        setProductToDelete(product);
        setProductDeleteAlertOpen(true);
    };

    const handleDeleteProduct = async () => {
        if (deleteAccessKey !== 'ADMIN123') {
            toast({
                variant: "destructive",
                title: "Error de Autenticación",
                description: "La clave de acceso es incorrecta.",
            });
            return;
        }

        if(productToDelete) {
            await deleteRecipeAndProduct(productToDelete);
            setProductDeleteAlertOpen(false);
            setProductToDelete(null);
            setDeleteAccessKey("");
        }
    };
    
    const handleTransferSubmit = async (values: TransferFormValues) => {
        await transferProduct(values, currentUser);
        setTransferDialogOpen(false);
    };

    const getStatusBadge = (status: InventoryItem['status']) => {
        switch (status) {
            case 'En Stock':
                return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
            case 'Stock Bajo':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
            case 'Pedido':
                return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100';
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Gestión de Inventario</CardTitle>
                            <CardDescription>
                                Administra materias primas y productos terminados.
                            </CardDescription>
                        </div>
                         <div className="flex gap-2">
                            {activeTab === 'raw' && (
                                <Button onClick={() => handleOpenMaterialDialog()}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Añadir Material
                                </Button>
                            )}
                             {activeTab === 'finished' && (
                                <>
                                    {canTransferStock && (
                                        <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
                                            <Truck className="mr-2 h-4 w-4" />
                                            Transferir a Almacén
                                        </Button>
                                    )}
                                    {canEditRecipes && (
                                        <Button variant="outline" onClick={() => handleOpenRecipeDialog()}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Crear Producto
                                        </Button>
                                    )}
                                    <Button onClick={() => setFabricationDialogOpen(true)}>
                                        <PackagePlus className="mr-2 h-4 w-4" />
                                       Fabricar Producto
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="raw">Materias Primas</TabsTrigger>
                            <TabsTrigger value="finished">Productos Terminados</TabsTrigger>
                        </TabsList>
                        <TabsContent value="raw">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                                        <TableHead className="hidden text-right sm:table-cell">Cantidad</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>
                                        <span className="sr-only">Acciones</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventoryItems.map((item) => {
                                        const supplier = suppliers.find(s => String(s.id) === String(item.supplierId));
                                        return (
                                            <TableRow 
                                                key={item.id}
                                                onClick={() => setSelectedRawMaterialId(item.id)}
                                                data-state={selectedRawMaterialId === item.id ? 'selected' : undefined}
                                                className="cursor-pointer"
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-sm text-muted-foreground md:hidden">
                                                        {supplier?.name || 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground sm:hidden">
                                                        {item.quantity.toLocaleString('es-ES')} {item.unit}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{supplier?.name || <span className="text-muted-foreground">N/A</span>}</TableCell>
                                                <TableCell className="hidden text-right sm:table-cell">{item.quantity.toLocaleString('es-ES')} {item.unit}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.status === 'Stock Bajo' ? 'destructive' : item.status === 'Pedido' ? 'secondary' : 'outline'} className={cn("capitalize", getStatusBadge(item.status))}>
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleOpenMaterialDialog(item)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenDeleteDialog(item)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="finished">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto Terminado</TableHead>
                                        <TableHead className="hidden md:table-cell">Zona</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead>
                                            <span className="sr-only">Acciones</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {finishedProducts.map((product) => (
                                        <TableRow 
                                            key={product.id}
                                            onClick={() => setSelectedFinishedProductId(product.id)}
                                            data-state={selectedFinishedProductId === product.id ? 'selected' : undefined}
                                            className="cursor-pointer"
                                        >
                                            <TableCell className="font-medium">
                                                <div>
                                                    {product.name}
                                                    <div className="text-sm text-muted-foreground md:hidden">
                                                        Zona: {product.zone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{product.zone}</TableCell>
                                            <TableCell className="text-right">{new Intl.NumberFormat('es-ES').format(product.quantity)}</TableCell>
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
                                                        {canEditRecipes && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleOpenRecipeDialog(product)}>Editar Producto</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleOpenDeleteProductDialog(product)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {!canEditRecipes && (
                                                            <DropdownMenuItem disabled>Sin acciones</DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Material' : 'Añadir Nuevo Material'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Actualiza los detalles del material.' : 'Rellena los detalles para añadir un nuevo material.'}
                        </DialogDescription>
                    </DialogHeader>
                    <MaterialForm
                        initialData={selectedItem}
                        onSubmit={handleMaterialSubmit}
                        onClose={handleCloseMaterialDialog}
                        suppliers={suppliers}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={fabricationDialogOpen} onOpenChange={setFabricationDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Fabricar Producto Terminado</DialogTitle>
                        <DialogDescription>
                            Elige un producto y la cantidad a fabricar. Se consumirán las materias primas necesarias.
                        </DialogDescription>
                    </DialogHeader>
                    <FabricationForm
                        products={availableProductsToFabricate}
                        onSubmit={handleFabricateSubmit}
                        onClose={() => setFabricationDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            
            <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Modifica el nombre y los ingredientes de este producto.' : 'Define el nombre y los ingredientes para un nuevo producto.'}
                        </DialogDescription>
                    </DialogHeader>
                    <RecipeForm
                        initialData={selectedProduct ? { productName: selectedProduct.name, ingredients: recipes[selectedProduct.name], zone: selectedProduct.zone, quantity: selectedProduct.quantity } : null}
                        rawMaterials={rawMaterialNames}
                        onSubmit={handleRecipeSubmit}
                        onClose={handleCloseRecipeDialog}
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

            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el material
                        de tu inventario.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={productDeleteAlertOpen} onOpenChange={(isOpen) => {
                setProductDeleteAlertOpen(isOpen);
                if (!isOpen) {
                    setDeleteAccessKey('');
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de eliminar el producto?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Para confirmar, introduce tu clave de acceso.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="product-delete-key">Clave de Acceso</Label>
                        <Input 
                            id="product-delete-key"
                            type="password"
                            placeholder="********"
                            value={deleteAccessKey}
                            onChange={(e) => setDeleteAccessKey(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
