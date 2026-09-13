
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
import type { FinishedProduct, Warehouse } from '@/lib/inventory-data';

const formSchema = z.object({
  productName: z.string().min(1, 'Seleccione un producto.'),
  quantity: z.coerce.number().positive('La cantidad debe ser positiva.'),
  warehouseId: z.string().min(1, 'Seleccione un almacén.'),
  driverName: z.string().min(1, 'El nombre del chófer es requerido.'),
  driverId: z.string().min(1, 'La cédula del chófer es requerida.'),
  vehicleBrand: z.string().min(1, 'La marca del vehículo es requerida.'),
  vehiclePlate: z.string().min(1, 'La placa del vehículo es requerida.'),
});

export type TransferFormValues = z.infer<typeof formSchema>;

interface TransferFormProps {
  finishedProducts: FinishedProduct[];
  warehouses: Warehouse[];
  onSubmit: (values: TransferFormValues) => void;
  onClose: () => void;
}

export function TransferForm({ finishedProducts, warehouses, onSubmit, onClose }: TransferFormProps) {
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        productName: '',
        quantity: 1,
        warehouseId: '',
        driverName: '',
        driverId: '',
        vehicleBrand: '',
        vehiclePlate: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Producto a Transferir</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                  {finishedProducts.map(product => (
                      <SelectItem key={product.id} value={product.name}>
                      {product.name} ({new Intl.NumberFormat('es-ES').format(product.quantity)} disp.)
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
              <FormLabel>Cantidad a Transferir</FormLabel>
              <FormControl>
                  <Input type="number" placeholder="e.g., 50" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Almacén de Destino</FormLabel>
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
        <h4 className="text-sm font-medium pt-4 border-t">Información de Transporte</h4>
        <FormField
          control={form.control}
          name="driverName"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Nombre del Chófer</FormLabel>
              <FormControl>
                  <Input placeholder="e.g., José Gonzalez" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="driverId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Cédula de Identidad del Chófer</FormLabel>
              <FormControl>
                  <Input placeholder="e.g., V-12.345.678" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vehicleBrand"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Marca y Modelo del Vehículo</FormLabel>
              <FormControl>
                  <Input placeholder="e.g., Toyota Hilux" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vehiclePlate"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Placa del Vehículo</FormLabel>
              <FormControl>
                  <Input placeholder="e.g., AB123CD" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar y Generar Nota</Button>
        </div>
      </form>
    </Form>
  );
}
