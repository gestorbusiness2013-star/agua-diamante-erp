
'use client';

import { useState } from "react";
import { PlusCircle, Edit, Trash2, Map } from "lucide-react";
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
import { useInventory } from "@/context/inventory-context";
import { RouteForm, type RouteFormValues } from "@/components/route-form";
import type { Route } from "@/lib/routes-data";
import { useToast } from "@/hooks/use-toast";

export default function RoutesPage() {
    const { routes, customers, saveRoute, deleteRoute } = useInventory();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const handleOpenDialog = (route?: Route) => {
        setSelectedRoute(route || null);
        setIsEditMode(!!route);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedRoute(null);
    };

    const handleSubmit = async (values: RouteFormValues) => {
        await saveRoute(values, isEditMode, selectedRoute);
        handleCloseDialog();
    };

    const handleOpenDeleteDialog = (route: Route) => {
        setRouteToDelete(route);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (routeToDelete) {
            await deleteRoute(routeToDelete.id);
            setDeleteAlertOpen(false);
            setRouteToDelete(null);
        }
    };
    
    const generateMapUrl = (route: Route) => {
        const companyAddress = "Agua Diamante, Guacara, Carabobo, Venezuela";
        
        const customerAddresses = route.customerIds
            .map(id => customers.find(c => String(c.id) === String(id)))
            .filter((c): c is NonNullable<typeof c> => !!c && !!c.address)
            .map(c => encodeURIComponent(c.address));
        
        if (customerAddresses.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No hay clientes',
                description: 'Esta ruta no tiene clientes con direcciones válidas para mostrar en el mapa.'
            });
            return '#';
        }

        const origin = encodeURIComponent(companyAddress);
        
        if (customerAddresses.length === 1) {
             return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${customerAddresses[0]}`;
        }
        
        const destination = customerAddresses.pop()!;
        const waypoints = customerAddresses.join('|');
        
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Gestión de Rutas de Venta</CardTitle>
                            <CardDescription>
                                Organiza tus clientes en rutas y visualízalas en el mapa.
                            </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Ruta
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                       {routes.map(route => {
                           const routeCustomers = route.customerIds.map(id => customers.find(c => String(c.id) === String(id))).filter(Boolean);
                           return (
                               <AccordionItem value={`item-${route.id}`} key={route.id}>
                                   <div className="flex items-center w-full">
                                       <AccordionTrigger className="flex-1 hover:no-underline">
                                           <div className="flex flex-col items-start text-left">
                                                <span className="font-medium text-lg">{route.name}</span>
                                                <span className="text-sm font-normal text-muted-foreground">{route.customerIds.length} cliente(s)</span>
                                           </div>
                                       </AccordionTrigger>
                                       <div className="flex items-center gap-1 pr-4 shrink-0">
                                            <Button asChild variant="outline" size="sm">
                                                <a href={generateMapUrl(route)} target="_blank" rel="noopener noreferrer">
                                                    <Map className="mr-2 h-4 w-4"/>
                                                    Ver Ruta
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(route)}>
                                               <Edit className="h-4 w-4" />
                                               <span className="sr-only">Editar ruta</span>
                                           </Button>
                                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(route)}>
                                               <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Eliminar ruta</span>
                                           </Button>
                                       </div>
                                   </div>
                                   <AccordionContent>
                                       {routeCustomers.length > 0 ? (
                                            <ul className="list-disc pl-5 pt-2 space-y-1 text-muted-foreground">
                                                {routeCustomers.map(customer => (
                                                    customer && <li key={customer.id}>{customer.name} - <span className="italic">{customer.address}</span></li>
                                                ))}
                                            </ul>
                                       ) : (
                                           <p className="text-sm text-muted-foreground px-4 py-2">Esta ruta no tiene clientes asignados.</p>
                                       )}
                                   </AccordionContent>
                               </AccordionItem>
                           )
                       })}
                    </Accordion>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar Ruta' : 'Crear Nueva Ruta'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Actualiza el nombre y los clientes de la ruta.' : 'Define un nombre y asigna clientes a la nueva ruta.'}
                        </DialogDescription>
                    </DialogHeader>
                    <RouteForm
                        initialData={selectedRoute}
                        customers={customers}
                        routes={routes}
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
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la ruta.
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
