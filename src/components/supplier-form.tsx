
'use client';

import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import type { Supplier } from '@/lib/suppliers-data';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  contactPerson: z.string().min(1, 'El nombre del contacto es requerido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  address: z.string().min(1, 'La dirección es requerida.'),
});

export type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  initialData?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => void;
  onClose: () => void;
}

export function SupplierForm({ initialData, onSubmit, onClose }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Plásticos de Venezuela C.A." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona de Contacto</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ernesto Gámez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="e.g., +58 414-1234567" {...field} />
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
                <Input type="email" placeholder="e.g., ventas@proveedor.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Zona Industrial La Hamaca, Maracay" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Proveedor'}</Button>
        </div>
      </form>
    </Form>
  );
}
