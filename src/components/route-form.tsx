
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Customer } from '@/lib/customers-data';
import type { Route } from '@/lib/routes-data';
import { useMemo } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre de la ruta es requerido.'),
  customerIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un cliente.'),
});

export type RouteFormValues = z.infer<typeof formSchema>;

interface RouteFormProps {
  initialData?: Route | null;
  customers: Customer[];
  routes: Route[];
  onSubmit: (values: RouteFormValues) => void;
  onClose: () => void;
}

export function RouteForm({ initialData, customers, routes, onSubmit, onClose }: RouteFormProps) {
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      customerIds: [],
    },
  });

  const customerRouteMap = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach(route => {
      // Si estamos editando, no queremos marcar los clientes de la ruta actual
      if (initialData && route.id === initialData.id) {
        return;
      }
      route.customerIds.forEach(customerId => {
        map.set(String(customerId), route.name);
      });
    });
    return map;
  }, [routes, initialData]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Ruta</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ruta Centro-Norte" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerIds"
          render={() => (
            <FormItem>
              <FormLabel>Clientes en la Ruta</FormLabel>
              <ScrollArea className="h-72 w-full rounded-md border p-4">
                {customers.map((customer) => {
                  const customerIdStr = String(customer.id);
                  const existingRouteName = customerRouteMap.get(customerIdStr);
                  return (
                    <FormField
                      key={customer.id}
                      control={form.control}
                      name="customerIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={customer.id}
                            className="flex flex-row items-start space-x-3 space-y-0 mb-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(customerIdStr)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), customerIdStr])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== customerIdStr
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              <div>
                                {customer.name}{' '}
                                {existingRouteName && (
                                  <span className="text-xs text-destructive">
                                    (En Ruta: {existingRouteName})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{customer.address}</div>
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  )
                })}
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Ruta'}</Button>
        </div>
      </form>
    </Form>
  );
}
