
'use client';

import { useState, useMemo } from "react";
import { MoreHorizontal, PlusCircle, MapPin, ClipboardCheck, AreaChart } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInventory } from "@/context/inventory-context";
import type { Customer } from "@/lib/customers-data";
import { CustomerForm, type CustomerFormValues } from "@/components/customer-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MarketStats = {
    productId: string;
    productName: string;
    avgPurchasePrice: number;
    avgSellingPrice: number;
    customerCount: number;
}

export default function CustomersPage() {
    const { 
        customers, 
        addCustomer, 
        updateCustomer, 
        deleteCustomer,
        marketProducts,
    } = useInventory();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const handleOpenDialog = (customer?: Customer) => {
        if (customer) {
            setSelectedCustomer(customer);
            setIsEditMode(true);
        } else {
            setSelectedCustomer(null);
            setIsEditMode(false);
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedCustomer(null);
    };

    const handleSubmit = async (values: CustomerFormValues) => {
        const customerData: Partial<Customer> = {
            name: values.name,
            rif: values.rif,
            contactPerson: values.contactPerson,
            phone: values.phone,
            email: values.email,
            address: values.address,
            geolocation: values.geolocation,
            marketSurvey: values.marketSurvey as any
        };

        if (isEditMode && selectedCustomer) {
            await updateCustomer({ ...selectedCustomer, ...customerData });
        } else {
            await addCustomer(customerData as Omit<CustomerFormValues, 'marketSurvey'>);
        }
        handleCloseDialog();
    };

    const handleOpenDeleteDialog = (customer: Customer) => {
        setCustomerToDelete(customer);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (customerToDelete) {
            await deleteCustomer(customerToDelete.id);
            setDeleteAlertOpen(false);
            setCustomerToDelete(null);
        }
    };
    
    const marketStats: MarketStats[] = useMemo(() => {
        return marketProducts.map(product => {
            const surveysForProduct = customers
                .map(c => c.marketSurvey?.find(s => s.productId === product.id))
                .filter((s): s is NonNullable<typeof s> => !!s);
            
            const totalPurchasePrice = surveysForProduct.reduce((sum, s) => sum + s.purchasePrice, 0);
            const totalSellingPrice = surveysForProduct.reduce((sum, s) => sum + s.sellingPrice, 0);
            const customerCount = surveysForProduct.length;

            return {
                productId: product.id,
                productName: product.name,
                avgPurchasePrice: customerCount > 0 ? totalPurchasePrice / customerCount : 0,
                avgSellingPrice: customerCount > 0 ? totalSellingPrice / customerCount : 0,
                customerCount: customerCount,
            };
        });
    }, [customers, marketProducts]);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <>
            <Tabs defaultValue="customers">
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="customers">Gestión de Clientes</TabsTrigger>
                        <TabsTrigger value="stats">Estadísticas de Mercado</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Cliente
                    </Button>
                </div>
                <TabsContent value="customers">
                    <Card>
                        <CardHeader>
                             <CardTitle className="font-headline">Lista de Clientes</CardTitle>
                            <CardDescription>
                                Añade, edita y gestiona la información de tus clientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                {customers.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No hay clientes registrados.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre del Cliente</TableHead>
                                                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                                                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                                                <TableHead>
                                                    <span className="sr-only">Acciones</span>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customers.map((customer) => (
                                                <TableRow key={customer.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="cursor-pointer" onClick={() => handleOpenDialog(customer)}>
                                                                <div>{customer.name}</div>
                                                                <div className="text-muted-foreground text-xs">{customer.rif}</div>
                                                            </div>
                                                            {customer.marketSurvey && customer.marketSurvey.length > 0 && (
                                                                 <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <ClipboardCheck className="h-4 w-4 text-primary" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Encuesta completada</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        {customer.geolocation && (
                                                            <a 
                                                                href={customer.geolocation} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                                            >
                                                                <MapPin className="h-3 w-3" />
                                                                Ver en mapa
                                                            </a>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <div className="cursor-pointer" onClick={() => handleOpenDialog(customer)}>
                                                            <p>{customer.contactPerson}</p>
                                                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        <div className="cursor-pointer" onClick={() => handleOpenDialog(customer)}>
                                                            {customer.phone}
                                                        </div>
                                                    </TableCell>
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
                                                                <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>Editar</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(customer)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Eliminar</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="stats">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <AreaChart />
                                Estadísticas de Precios del Mercado
                            </CardTitle>
                            <CardDescription>
                                Precios promedio de compra y venta de productos de la competencia, basados en las encuestas a clientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto de Mercado</TableHead>
                                        <TableHead className="text-center"># Clientes que lo Venden</TableHead>
                                        <TableHead className="text-right">Precio de Compra Promedio</TableHead>
                                        <TableHead className="text-right">Precio de Venta Promedio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {marketStats.map(stat => (
                                        <TableRow key={stat.productId}>
                                            <TableCell className="font-medium">{stat.productName}</TableCell>
                                            <TableCell className="text-center">{stat.customerCount}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.avgPurchasePrice > 0 ? formatCurrency(stat.avgPurchasePrice) : 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{stat.avgSellingPrice > 0 ? formatCurrency(stat.avgSellingPrice) : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Actualiza los detalles del cliente.' : 'Rellena los detalles para añadir un nuevo cliente.'}
                        </DialogDescription>
                    </DialogHeader>
                    <CustomerForm
                        initialData={selectedCustomer}
                        marketProducts={marketProducts}
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
                        Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente.
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
