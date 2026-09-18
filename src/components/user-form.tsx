'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { type User, type UserFormValues, userFormSchema, permissionLabels, getDefaultPermissions } from '@/lib/users-data';
import { Separator } from './ui/separator';

interface UserFormProps {
  initialData?: User | null;
  isEditMode: boolean;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  onClose: () => void;
}

export function UserForm({ initialData, isEditMode, onSubmit, onClose }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData 
      ? { 
          ...initialData, 
          commissionRate: initialData.commissionRate || 0, 
          isEditMode: true,
          permissions: initialData.permissions || getDefaultPermissions(initialData.role)
        }
      : {
          name: '',
          email: '',
          role: 'Operador',
          commissionRate: 0,
          password: '',
          confirmPassword: '',
          isEditMode: false,
          permissions: getDefaultPermissions('Operador'),
        },
  });

  const selectedRole = form.watch('role');

  const handleFormSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., juan.perez@example.com" {...field} disabled={isEditMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select 
                onValueChange={(val: any) => {
                  field.onChange(val);
                  const perms = getDefaultPermissions(val);
                  Object.entries(perms).forEach(([k, v]) => {
                    form.setValue(`permissions.${k}` as any, v);
                  });
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Gerente de Planta">Gerente de Planta</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                  <SelectItem value="Operador">Operador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedRole === 'Vendedor' && (
            <FormField
            control={form.control}
            name="commissionRate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tasa de Comisión (%)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 5" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <div className="space-y-3">
          <Separator className="my-4" />
          <div>
            <FormLabel className="text-sm font-semibold text-foreground">Permisos de Acceso</FormLabel>
            <p className="text-xs text-muted-foreground">Personaliza a qué módulos tiene acceso este usuario.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border">
            {Object.entries(permissionLabels).map(([key, label]) => (
              <FormField
                key={key}
                control={form.control}
                name={`permissions.${key}` as any}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2 hover:bg-muted/60 transition-colors">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-medium cursor-pointer">
                        {label}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {!isEditMode && (
            <>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirmar</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                    La contraseña debe tener al menos 6 caracteres.
                </p>
            </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
