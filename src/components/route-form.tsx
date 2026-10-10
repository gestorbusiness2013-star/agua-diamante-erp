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
import { Badge } from '@/components/ui/badge';
import type { Customer } from '@/lib/customers-data';
import type { Route } from '@/lib/routes-data';
import type { Warehouse } from '@/lib/inventory-data';
import type { User } from '@/lib/users-data';
import { useMemo, useState, useEffect } from 'react';
import { MapPin, Warehouse as WarehouseIcon, Factory, UserCheck, Calendar, Search, CheckCheck, XCircle } from 'lucide-react';

export const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

const formSchema = z.object({
  warehouseId: z.string().min(1, 'Seleccione un almacén o punto de partida.'),
  warehouseName: z.string().optional(),
  startAddress: z.string().min(1, 'La dirección del punto de partida es requerida.'),
  name: z.string().min(1, 'El nombre de la ruta es requerido.'),
  sellerId: z.string().optional(),
  sellerName: z.string().optional(),
  visitDays: z.array(z.string()).optional(),
  customerIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un cliente.'),
});

export type RouteFormValues = z.infer<typeof formSchema>;

interface RouteFormProps {
  initialData?: Route | null;
  customers: Customer[];
  routes: Route[];
  warehouses: Warehouse[];
  users?: User[];
  onSubmit: (values: RouteFormValues) => void;
  onClose: () => void;
}

export function RouteForm({ initialData, customers, routes, warehouses, users = [], onSubmit, onClose }: RouteFormProps) {
  const [customerSearch, setCustomerSearch] = useState('');

  // Filtrar usuarios que sean vendedores
  const sellers = useMemo(() => {
    return users.filter(u => String(u.role).toLowerCase() === 'vendedor');
  }, [users]);

  const defaultWarehouseId = initialData?.warehouseId || (warehouses[0] ? String(warehouses[0].id) : 'factory');
  const defaultWarehouseName = initialData?.warehouseName || (warehouses[0] ? warehouses[0].name : 'Fábrica Principal (Agua Diamante)');
  const defaultStartAddress = initialData?.startAddress || (warehouses[0]?.address || (warehouses[0] ? `${warehouses[0].name}, Venezuela` : 'Agua Diamante, Guacara, Carabobo, Venezuela'));

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouseId: defaultWarehouseId,
      warehouseName: defaultWarehouseName,
      startAddress: defaultStartAddress,
      name: initialData?.name || '',
      sellerId: initialData?.sellerId || '',
      sellerName: initialData?.sellerName || '',
      visitDays: initialData?.visitDays || [],
      customerIds: initialData?.customerIds || [],
    },
  });

  // Reset del formulario cuando cambia initialData para evitar bugs de persistencia entre modales
  useEffect(() => {
    if (initialData) {
      form.reset({
        warehouseId: initialData.warehouseId || defaultWarehouseId,
        warehouseName: initialData.warehouseName || defaultWarehouseName,
        startAddress: initialData.startAddress || defaultStartAddress,
        name: initialData.name,
        sellerId: initialData.sellerId || '',
        sellerName: initialData.sellerName || '',
        visitDays: initialData.visitDays || [],
        customerIds: initialData.customerIds || [],
      });
    } else {
      form.reset({
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        startAddress: defaultStartAddress,
        name: '',
        sellerId: '',
        sellerName: '',
        visitDays: [],
        customerIds: [],
      });
    }
    setCustomerSearch('');
  }, [initialData, form, defaultWarehouseId, defaultWarehouseName, defaultStartAddress]);

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

  // Filtrado de clientes por texto
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

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

  const handleSellerChange = (val: string) => {
    if (val === 'none') {
      form.setValue('sellerId', '');
      form.setValue('sellerName', '');
      return;
    }
    const seller = sellers.find(s => String(s.id) === val);
    if (seller) {
      form.setValue('sellerId', String(seller.id));
      form.setValue('sellerName', seller.name);
    }
  };

  const currentCustomerIds = form.watch('customerIds') || [];
  const currentVisitDays = form.watch('visitDays') || [];

  const toggleDay = (day: string) => {
    const exists = currentVisitDays.includes(day);
    if (exists) {
      form.setValue('visitDays', currentVisitDays.filter(d => d !== day));
    } else {
      form.setValue('visitDays', [...currentVisitDays, day]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCustomers.map(c => String(c.id));
    const merged = Array.from(new Set([...currentCustomerIds, ...filteredIds]));
    form.setValue('customerIds', merged, { shouldValidate: true });
  };

  const handleClearSelection = () => {
    form.setValue('customerIds', [], { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. SELECCIONAR PRIMERO EL ALMACÉN DE PARTIDA */}
        <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-xs flex items-center gap-1.5 text-primary">
                  <WarehouseIcon className="h-4 w-4" />
                  1. Almacén o Punto de Partida
                </FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={handleWarehouseChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-xs">
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Dirección exacta de salida (para Google Maps)
                </FormLabel>
                <FormControl>
                  <Input className="h-8 text-xs" placeholder="Ej. Calle Principal, Almacén Torre América, Caracas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 2. DATOS DE LA RUTA Y VENDEDOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-xs">2. Nombre de la Ruta</FormLabel>
                <FormControl>
                  <Input className="h-9 text-xs" placeholder="e.g., Ruta Centro - Guacara" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Vendedor Asignado */}
          <FormField
            control={form.control}
            name="sellerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-xs flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Vendedor Responsable
                </FormLabel>
                <Select
                  value={field.value || 'none'}
                  onValueChange={handleSellerChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Sin vendedor asignado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground italic">Sin asignar (Disponible)</span>
                    </SelectItem>
                    {sellers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 3. DÍAS DE VISITA / PROGRAMACIÓN */}
        <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Días de Visita Programados
            </span>
            <span className="text-[10px] text-muted-foreground">
              {currentVisitDays.length > 0 ? `${currentVisitDays.length} día(s) seleccionados` : 'Opcional'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DAYS_OF_WEEK.map(day => {
              const active = currentVisitDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. CLIENTES EN LA RUTA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <FormLabel className="font-semibold text-xs">
              4. Clientes a Visitar en la Ruta
            </FormLabel>
            <Badge variant="outline" className="text-xs font-mono font-semibold">
              {currentCustomerIds.length} de {customers.length} clientes
            </Badge>
          </div>

          {/* Barra de búsqueda y controles rápidos */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nombre o dirección..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            {filteredCustomers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 gap-1"
                onClick={handleSelectAllFiltered}
              >
                <CheckCheck className="h-3 w-3" />
                Todos
              </Button>
            )}
            {currentCustomerIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2 text-muted-foreground hover:text-destructive gap-1"
                onClick={handleClearSelection}
              >
                <XCircle className="h-3 w-3" />
                Limpiar
              </Button>
            )}
          </div>

          <ScrollArea className="h-56 w-full rounded-xl border p-2 bg-card shadow-inner">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {customers.length === 0 ? 'No hay clientes registrados en el sistema.' : 'No se encontraron clientes con esa búsqueda.'}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredCustomers.map((customer) => {
                  const customerIdStr = String(customer.id);
                  const existingRouteName = customerRouteMap.get(customerIdStr);
                  const isChecked = currentCustomerIds.includes(customerIdStr);

                  return (
                    <div
                      key={customer.id}
                      onClick={() => {
                        if (isChecked) {
                          form.setValue(
                            'customerIds',
                            currentCustomerIds.filter(id => id !== customerIdStr),
                            { shouldValidate: true }
                          );
                        } else {
                          form.setValue(
                            'customerIds',
                            [...currentCustomerIds, customerIdStr],
                            { shouldValidate: true }
                          );
                        }
                      }}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                        isChecked 
                          ? 'bg-primary/10 border-primary/40' 
                          : 'hover:bg-muted/40 border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {}}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">{customer.name}</span>
                          {existingRouteName && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-700 dark:text-amber-300 shrink-0 font-medium">
                              En: {existingRouteName}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {customer.address || 'Sin dirección registrada'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {form.formState.errors.customerIds && (
            <p className="text-xs font-medium text-destructive">{form.formState.errors.customerIds.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} size="sm">
            Cancelar
          </Button>
          <Button type="submit" size="sm">{initialData ? 'Guardar Cambios' : 'Crear Ruta'}</Button>
        </div>
      </form>
    </Form>
  );
}
