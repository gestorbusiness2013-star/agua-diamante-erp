'use client';

import { useState } from "react";
import { MoreHorizontal, PlusCircle, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserForm } from "@/components/user-form";
import type { User, UserFormValues } from "@/lib/users-data";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
    const { users, createUser, updateUser, deleteUser } = useInventory();
    const { toast } = useToast();
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleOpenUserDialog = (user?: User) => {
        setSelectedUser(user || null);
        setIsEditMode(!!user);
        setUserDialogOpen(true);
    };

    const handleUserSubmit = async (values: UserFormValues) => {
        try {
            if (isEditMode && selectedUser) {
                await updateUser({
                    ...selectedUser,
                    name: values.name,
                    role: values.role,
                    commissionRate: values.commissionRate,
                    permissions: values.permissions
                });
            } else {
                await createUser(values);
            }
            setUserDialogOpen(false);
        } catch (error: any) {
            console.error("Error in user submit:", error);
            toast({ variant: "destructive", title: "Error", description: error?.message || "Ocurrió un error inesperado." });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestión de Acceso</CardTitle>
                        <CardDescription>Controla quién puede entrar al ERP y sus comisiones.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenUserDialog()}><UserPlus className="mr-2 h-4 w-4" />Crear Usuario</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Comisión</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8"><AvatarFallback>{u.name?.[0] || '?'}</AvatarFallback></Avatar>
                                        <div className="flex flex-col"><span className="font-medium">{u.name || 'Usuario'}</span><span className="text-xs text-muted-foreground">{u.email}</span></div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                                    <TableCell className="text-right">{u.role === 'Vendedor' ? `${u.commissionRate}%` : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenUserDialog(u)}>Editar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setUserToDelete(u); setDeleteAlertOpen(true); }} className="text-destructive">Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Crear'} Usuario</DialogTitle></DialogHeader>
                    <UserForm isEditMode={isEditMode} initialData={selectedUser} onSubmit={handleUserSubmit} onClose={() => setUserDialogOpen(false)} />
                </DialogContent>
            </Dialog>
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se eliminará el perfil de la base de datos pero no sus credenciales de Firebase Auth.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { if (userToDelete) await deleteUser(userToDelete.id); setDeleteAlertOpen(false); }}>Eliminar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
