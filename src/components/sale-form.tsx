
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
import type { Warehouse, WarehouseStockItem } from '@/lib/inventory-data';
import type { Customer } from '@/lib/customers-data';
import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import type { Sale } from '@/lib/sales-data';

const formSchema = z.object({
  warehouseId: z.string().min(1, 'Seleccione un almacén.'),
  productName: z.string().min(1, 'Seleccione un producto.'),
  quantity: z.coerce.number().positive('La cantidad debe ser positiva.'),
  unitPrice: z.coerce.number().positive('El precio debe ser positivo.'),
  customerId: z.string().min(1, 'Seleccione un cliente.'),
  customerName: z.string().min(1, 'El nombre del cliente es requerido.'),
  description: z.string().optional(),
  saleType: z.enum(['Directa', 'Consignación'], { required_error: 'Seleccione un tipo de venta.'}),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Tarjeta'], { required_error: 'Seleccione un método de pago.' }),
  documentType: z.enum(['Factura', 'Nota de Entrega'], { required_error: 'Seleccione un tipo de documento.' }),
});

export type SaleFormValues = z.infer<typeof formSchema>;

interface SaleFormProps {
  warehouses: Warehouse[];
  customers: Customer[];
  onSubmit: (values: SaleFormValues) => void;
  onClose: () => void;
  initialData?: Sale | null;
}

export function SaleForm({ warehouses, customers, onSubmit, onClose, initialData }: SaleFormProps) {
  const [availableProducts, setAvailableProducts] = useState<WarehouseStockItem[]>([]);
  const isEditMode = !!initialData;
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        warehouseId: String(initialData.warehouseId), // Ensure it's a string
    } : {
        warehouseId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        customerId: '',
        customerName: '',
        description: '',
        saleType: 'Directa',
        paymentMethod: 'Efectivo',
        documentType: 'Factura',
    },
  });

  const selectedWarehouseId = form.watch('warehouseId');
  const selectedCustomerId = form.watch('customerId');

  useEffect(() => {
    if (selectedWarehouseId) {
      const warehouse = warehouses.find(w => String(w.id) === selectedWarehouseId);
      if (warehouse) {
          const productsInStock = [...warehouse.stock];
          if (isEditMode && initialData && String(initialData.warehouseId) === selectedWarehouseId) {
            const productInInitialData = productsInStock.find(p => p.productName === initialData.productName);
            if (!productInInitialData) {
              productsInStock.push({ productName: initialData.productName, quantity: initialData.quantity});
            }
          }
          setAvailableProducts(productsInStock);
      } else {
        setAvailableProducts([]);
      }
      
      if (!isEditMode) {
        form.setValue('productName', ''); 
      }
    } else {
      setAvailableProducts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouseId, warehouses, isEditMode, initialData]);
  
  useEffect(() => {
    if (selectedCustomerId) {
        const customer = customers.find(c => String(c.id) === selectedCustomerId);
        if (customer) {
            form.setValue('customerName', customer.name);
        }
    }
  }, [selectedCustomerId, customers, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-4">
        
        <h4 className="text-sm font-medium pt-2 border-t">Información del Cliente</h4>
         <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                  {customers.map(customer => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name} ({customer.rif})
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
              <FormMessage />
              </FormItem>
          )}
        />
        
        <h4 className="text-sm font-medium pt-4 border-t">Detalles de la Orden</h4>
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Vender desde Almacén</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value}
                disabled={isEditMode}
              >
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
              <FormLabel>Producto a Vender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedWarehouseId || isEditMode}>
                  <FormControl>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                  {availableProducts.map(product => (
                      <SelectItem key={product.productName} value={product.productName}>
                      {product.productName} ({new Intl.NumberFormat('es-ES').format(product.quantity)} disp.)
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
              <FormMessage />
              </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                      <Input type="number" placeholder="e.g., 10" {...field} disabled={isEditMode}/>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Precio Unit. (USD)</FormLabel>
                  <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 2.50" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
        </div>
        
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                  <Textarea placeholder="Añade una nota o descripción para el documento..." {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="saleType"
            render={({ field }) => (
                <FormItem className="space-y-2 pt-4 border-t">
                    <FormLabel>Tipo de Venta</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Directa" /></FormControl>
                                <FormLabel className="font-normal">Directa</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Consignación" /></FormControl>
                                <FormLabel className="font-normal">Consignación</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Método de Pago</FormLabel>
               <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un método" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="documentType"
            render={({ field }) => (
                <FormItem className="space-y-2">
                    <FormLabel>Tipo de Documento a Generar</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="Factura" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Factura
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="Nota de Entrega" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Nota de Entrega
                            </FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{isEditMode ? 'Guardar Cambios' : 'Crear Orden'}</Button>
        </div>
      </form>
    </Form>
  );
}
