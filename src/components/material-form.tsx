
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
import type { InventoryItem } from '@/lib/inventory-data';
import type { Supplier } from '@/lib/suppliers-data';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  quantity: z.coerce.number().min(0, 'La cantidad no puede ser negativa.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
  lowStockThreshold: z.coerce.number().min(0, 'El umbral no puede ser negativo.'),
  status: z.enum(['En Stock', 'Stock Bajo', 'Pedido']),
  supplierId: z.coerce.string().optional(),
  accessKey: z.string().min(1, 'La clave de acceso es requerida.'),
});

export type MaterialFormValues = z.infer<typeof formSchema>;

interface MaterialFormProps {
  initialData?: InventoryItem | null;
  onSubmit: (values: MaterialFormValues) => void;
  onClose: () => void;
  suppliers: Supplier[];
}

export function MaterialForm({ initialData, onSubmit, onClose, suppliers }: MaterialFormProps) {
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      quantity: initialData.quantity,
      accessKey: '',
      supplierId: String(initialData.supplierId) || 'none'
    } : {
      name: '',
      quantity: 0,
      unit: '',
      lowStockThreshold: 0,
      status: 'En Stock',
      supplierId: 'none',
      accessKey: '',
    },
  });

  const handleSubmit = (values: MaterialFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Material</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Botellas PET 1L" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value)}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un proveedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
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
              <FormLabel>Cantidad</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 10000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad</FormLabel>
              <FormControl>
                <Input placeholder="e.g., unidades" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lowStockThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Umbral de Stock Bajo</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="En Stock">En Stock</SelectItem>
                  <SelectItem value="Stock Bajo">Stock Bajo</SelectItem>
                  <SelectItem value="Pedido">Pedido (Manual)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="accessKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clave de Acceso</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Añadir Material'}</Button>
        </div>
      </form>
    </Form>
  );
}
