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
import { type ProductionLine } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  currentProduct: z.string().min(1, 'El nombre del producto es requerido.'),
  outputPerHour: z.coerce.number().positive('El rendimiento debe ser un número positivo.'),
  targetQuantity: z.coerce.number().positive('La cantidad objetivo debe ser un número positivo.'),
});

export type ProductionOrderValues = z.infer<typeof formSchema>;

interface ProductionOrderFormProps {
  initialData?: ProductionLine | null;
  onSubmit: (values: ProductionOrderValues) => void;
  onClose: () => void;
  finishedProducts: string[];
}

export function ProductionOrderForm({ initialData, onSubmit, onClose, finishedProducts }: ProductionOrderFormProps) {
  const form = useForm<ProductionOrderValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentProduct: initialData?.currentProduct !== 'N/A' ? initialData?.currentProduct : (finishedProducts[0] || ''),
      outputPerHour: initialData?.outputPerHour || 0,
      targetQuantity: initialData?.targetQuantity || 10000,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="currentProduct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto Terminado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {finishedProducts.map(product => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outputPerHour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rendimiento (unidades/hora)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad Objetivo (unidades)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 10000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Crear Orden</Button>
        </div>
      </form>
    </Form>
  );
}
