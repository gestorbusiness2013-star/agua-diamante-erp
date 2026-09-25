
'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useState, useEffect, useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import type { Sale } from '@/lib/sales-data';
import { PlusCircle, Trash2 } from 'lucide-react';

const saleItemSchema = z.object({
    productName: z.string().min(1, 'Seleccione un producto.'),
    quantity: z.coerce.number().positive('Cantidad debe ser positiva.'),
    unitPrice: z.coerce.number().positive('Precio debe ser positivo.'),
});

const formSchema = z.object({
  warehouseId: z.string().min(1, 'Seleccione un almacén.'),
  items: z.array(saleItemSchema).min(1, 'Agrega al menos un producto.'),
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
  
  const getInitialItems = () => {
      if (!initialData) return [{ productName: '', quantity: 1, unitPrice: 0 }];
      if (initialData.items && initialData.items.length > 0) {
          return initialData.items.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice }));
      }
      return [{ productName: initialData.productName || '', quantity: initialData.quantity || 1, unitPrice: initialData.unitPrice || 0 }];
  };

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        warehouseId: String(initialData.warehouseId),
        items: getInitialItems(),
        customerId: String(initialData.customerId),
        customerName: initialData.customerName,
        description: initialData.description || '',
        saleType: initialData.saleType,
        paymentMethod: initialData.paymentMethod,
        documentType: initialData.documentType,
    } : {
        warehouseId: '',
        items: [{ productName: '', quantity: 1, unitPrice: 0 }],
        customerId: '',
        customerName: '',
        description: '',
        saleType: 'Directa',
        paymentMethod: 'Efectivo',
        documentType: 'Factura',
    },
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'items',
  });

  const selectedWarehouseId = form.watch('warehouseId');
  const selectedCustomerId = form.watch('customerId');
  const watchedItems = form.watch('items');

  const totalAmount = useMemo(() => {
      return (watchedItems || []).reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || 0;
          return sum + (qty * price);
      }, 0);
  }, [watchedItems]);

  useEffect(() => {
    if (selectedWarehouseId) {
      const warehouse = warehouses.find(w => String(w.id) === selectedWarehouseId);
      if (warehouse) {
          setAvailableProducts(warehouse.stock.filter(s => (Number(s.quantity) || 0) > 0));
      } else {
        setAvailableProducts([]);
      }
    } else {
      setAvailableProducts([]);
    }
  }, [selectedWarehouseId, warehouses]);
  
  useEffect(() => {
    if (selectedCustomerId) {
        const customer = customers.find(c => String(c.id) === selectedCustomerId);
        if (customer) {
            form.setValue('customerName', customer.name);
        }
    }
  }, [selectedCustomerId, customers, form]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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
        
        <h4 className="text-sm font-medium pt-4 border-t">Productos</h4>
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Vender desde Almacén</FormLabel>
              <Select 
                onValueChange={(value) => {
                    field.onChange(value);
                    // Reset items when warehouse changes
                    if (!isEditMode) {
                        form.setValue('items', [{ productName: '', quantity: 1, unitPrice: 0 }]);
                    }
                }}
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

        {/* Dynamic Items Table */}
        <div className="space-y-3">
            {fields.map((field, index) => {
                const itemSubtotal = (Number(watchedItems?.[index]?.quantity) || 0) * (Number(watchedItems?.[index]?.unitPrice) || 0);
                return (
                    <div key={field.id} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Producto {index + 1}</span>
                            {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)} disabled={isEditMode}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <FormField
                            control={form.control}
                            name={`items.${index}.productName`}
                            render={({ field: itemField }) => (
                                <FormItem>
                                    <Select onValueChange={itemField.onChange} value={itemField.value} disabled={!selectedWarehouseId || isEditMode}>
                                        <FormControl>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Seleccione producto" />
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
                        <div className="grid grid-cols-3 gap-2">
                            <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: itemField }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Cantidad</FormLabel>
                                        <FormControl>
                                            <Input type="number" className="h-9" placeholder="0" {...itemField} disabled={isEditMode} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field: itemField }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Precio USD</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" className="h-9" placeholder="0.00" {...itemField} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex flex-col justify-end">
                                <span className="text-xs text-muted-foreground">Subtotal</span>
                                <span className="text-sm font-semibold h-9 flex items-center">{formatCurrency(itemSubtotal)}</span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {!isEditMode && (
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-dashed"
                    onClick={() => append({ productName: '', quantity: 1, unitPrice: 0 })}
                    disabled={!selectedWarehouseId}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Producto
                </Button>
            )}

            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-semibold">Total General:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
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
