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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Customer } from '@/lib/customers-data';
import type { Route } from '@/lib/routes-data';
import type { Warehouse } from '@/lib/inventory-data';
import { useMemo } from 'react';
import { MapPin, Warehouse as WarehouseIcon, Factory } from 'lucide-react';

const formSchema = z.object({
  warehouseId: z.string().min(1, 'Seleccione un almacén o punto de partida.'),
  warehouseName: z.string().optional(),
  startAddress: z.string().min(1, 'La dirección del punto de partida es requerida.'),
  name: z.string().min(1, 'El nombre de la ruta es requerido.'),
  customerIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un cliente.'),
});

export type RouteFormValues = z.infer<typeof formSchema>;

interface RouteFormProps {
  initialData?: Route | null;
  customers: Customer[];
  routes: Route[];
  warehouses: Warehouse[];
  onSubmit: (values: RouteFormValues) => void;
  onClose: () => void;
}

export function RouteForm({ initialData, customers, routes, warehouses, onSubmit, onClose }: RouteFormProps) {
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouseId: initialData?.warehouseId || (warehouses[0] ? String(warehouses[0].id) : 'factory'),
      warehouseName: initialData?.warehouseName || (warehouses[0] ? warehouses[0].name : 'Fábrica Principal (Agua Diamante)'),
      startAddress: initialData?.startAddress || (warehouses[0]?.address || (warehouses[0] ? `${warehouses[0].name}, Venezuela` : 'Agua Diamante, Guacara, Carabobo, Venezuela')),
      name: initialData?.name || '',
      customerIds: initialData?.customerIds || [],
    },
  });

  const customerRouteMap = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach(route => {
      if (initialData && route.id === initialData.id) {
        return;
      }
      route.customerIds.forEach(customerId => {
        map.set(String(customerId), route.name);
      });
    });
    return map;
  }, [routes, initialData]);

  const handleWarehouseChange = (val: string) => {
    form.setValue('warehouseId', val);
    if (val === 'factory') {
      form.setValue('warehouseName', 'Fábrica Principal (Agua Diamante)');
      form.setValue('startAddress', 'Agua Diamante, Guacara, Carabobo, Venezuela');
    } else {
      const wh = warehouses.find(w => String(w.id) === val);
      if (wh) {
        form.setValue('warehouseName', wh.name);
        form.setValue('startAddress', wh.address || `${wh.name}, Venezuela`);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. SELECCIONAR PRIMERO EL ALMACÉN DE PARTIDA */}
        <div className="p-4 bg-muted/40 rounded-lg border space-y-4">
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                  <WarehouseIcon className="h-4 w-4" />
                  1. Almacén o Punto de Partida
                </FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={handleWarehouseChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el almacén de salida" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="factory">
                      <div className="flex items-center gap-2">
                        <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Fábrica Principal (Guacara, Carabobo)</span>
                      </div>
                    </SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{w.name}</span>
                          {w.address && (
                            <span className="text-xs text-muted-foreground">({w.address})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  La ruta de Google Maps partirá desde este almacén hacia los clientes.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Dirección exacta de salida (para Google Maps)
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Calle Principal, Almacén Torre América, Caracas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 2. NOMBRE DE LA RUTA */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-sm">2. Nombre de la Ruta</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ruta Torre América - Clientes Centro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3. CLIENTES EN LA RUTA */}
        <FormField
          control={form.control}
          name="customerIds"
          render={() => (
            <FormItem>
              <FormLabel className="font-semibold text-sm">3. Clientes a Visitar en la Ruta</FormLabel>
              <ScrollArea className="h-64 w-full rounded-md border p-3 bg-card">
                {customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay clientes registrados.</p>
                ) : (
                  customers.map((customer) => {
                    const customerIdStr = String(customer.id);
                    const existingRouteName = customerRouteMap.get(customerIdStr);
                    return (
                      <FormField
                        key={customer.id}
                        control={form.control}
                        name="customerIds"
                        render={({ field }) => {
                          const isChecked = field.value?.includes(customerIdStr);
                          return (
                            <FormItem
                              key={customer.id}
                              className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors border-b last:border-b-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), customerIdStr])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== customerIdStr
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer flex-1">
                                <div className="font-medium text-foreground flex items-center justify-between">
                                  <span>{customer.name}</span>
                                  {existingRouteName && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                                      (En: {existingRouteName})
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{customer.address || 'Sin dirección registrada'}</div>
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    );
                  })
                )}
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Ruta'}</Button>
        </div>
      </form>
    </Form>
  );
}
