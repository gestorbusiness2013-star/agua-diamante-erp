
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
import type { MarketProduct } from '@/lib/customers-data';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  description: z.string().optional(),
});

export type MarketProductFormValues = z.infer<typeof formSchema>;

interface MarketProductFormProps {
  initialData?: MarketProduct | null;
  onSubmit: (values: MarketProductFormValues) => void;
  onClose: () => void;
}

export function MarketProductForm({ initialData, onSubmit, onClose }: MarketProductFormProps) {
  const form = useForm<MarketProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: initialData?.name || '',
        description: initialData?.description || '',
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Agua Mineral Nevada 1.5L" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Añade una nota o descripción para este producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Producto'}</Button>
        </div>
      </form>
    </Form>
  );
}
