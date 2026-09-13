
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

const ZONES = ["Zona A", "Zona B", "Zona C", "Zona D"] as const;

const formSchema = z.object({
  productName: z.string().min(1, 'Se requiere el nombre del producto.'),
  quantity: z.coerce.number().positive('La cantidad debe ser un número positivo.'),
  zone: z.enum(ZONES, { required_error: 'Se requiere una zona de almacenamiento.' }),
});

export type FabricationFormValues = z.infer<typeof formSchema>;

interface FabricationFormProps {
  products: string[];
  onSubmit: (values: FabricationFormValues) => void;
  onClose: () => void;
}

export function FabricationForm({ products, onSubmit, onClose }: FabricationFormProps) {
  const form = useForm<FabricationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: products.length > 0 ? products[0] : '',
      quantity: 1,
      zone: 'Zona A',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producto a Fabricar</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map(product => (
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad a Fabricar (Packs/Unidades)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Almacenar en Zona</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una zona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ZONES.map(zone => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Fabricar</Button>
        </div>
      </form>
    </Form>
  );
}
