
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Warehouse } from '@/lib/inventory-data';
import { useInventory } from '@/context/inventory-context';

const formSchema = z.object({
  warehouseId: z.string().min(1, 'Seleccione un almacén.'),
  productName: z.string().min(1, 'Seleccione un producto.'),
  quantity: z.coerce.number().positive('La cantidad debe ser positiva.'),
});

export type StockRequestFormValues = z.infer<typeof formSchema>;

interface StockRequestFormProps {
  warehouses: Warehouse[];
  onSubmit: (values: StockRequestFormValues) => void;
  onClose: () => void;
}

export function StockRequestForm({ warehouses, onSubmit, onClose }: StockRequestFormProps) {
  const { finishedProducts } = useInventory(); // Get all possible products
  
  const form = useForm<StockRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        warehouseId: '',
        productName: '',
        quantity: 1,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Almacén Solicitante</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccione un almacén" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                  {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                      {warehouse.name}
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
          name="productName"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Producto Requerido</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                  {finishedProducts.map(product => (
                      <SelectItem key={product.id} value={product.name}>
                        {product.name}
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
          name="quantity"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Cantidad Requerida</FormLabel>
              <FormControl>
                  <Input type="number" placeholder="e.g., 50" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Enviar Solicitud</Button>
        </div>
      </form>
    </Form>
  );
}

