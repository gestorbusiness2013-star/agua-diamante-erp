
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
import type { Warehouse } from '@/lib/inventory-data';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
});

export type WarehouseFormValues = z.infer<typeof formSchema>;

interface WarehouseFormProps {
  initialData?: Warehouse | null;
  onSubmit: (values: WarehouseFormValues) => void;
  onClose: () => void;
}

export function WarehouseForm({ initialData, onSubmit, onClose }: WarehouseFormProps) {
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Almacén</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Almacén Central" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Añadir Almacén'}</Button>
        </div>
      </form>
    </Form>
  );
}
