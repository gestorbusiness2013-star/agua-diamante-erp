'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PurchaseOrder } from '@/lib/purchases-data';
import type { Supplier } from '@/lib/suppliers-data';
import type { InventoryItem } from '@/lib/inventory-data';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

const orderItemSchema = z.object({
  materialId: z.string().min(1, 'Selecciona un material.'),
  quantity: z.coerce.number().positive('La cantidad debe ser positiva.'),
  unitPrice: z.coerce.number().positive('El precio debe ser positivo.'),
});

const formSchema = z.object({
  supplierId: z.string().min(1, 'Seleccione un proveedor.'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'La orden debe tener al menos un item.'),
});

export type PurchaseOrderFormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  initialData?: PurchaseOrder | null;
  suppliers: Supplier[];
  materials: InventoryItem[];
  onSubmit: (values: PurchaseOrderFormValues) => void;
  onClose: () => void;
}

export function PurchaseOrderForm({ initialData, suppliers, materials, onSubmit, onClose }: PurchaseOrderFormProps) {
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? { 
        supplierId: initialData.supplierId, 
        notes: initialData.notes || '', 
        items: initialData.items.map(i => ({ materialId: i.materialId, quantity: i.quantity, unitPrice: i.unitPrice })) 
    } : { 
        supplierId: '', 
        notes: '', 
        items: [{ materialId: '', quantity: 1, unitPrice: 0 }] 
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchItems = form.watch('items');
  const total = useMemo(() => watchItems.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0), [watchItems]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="supplierId" render={({ field }) => (
            <FormItem><FormLabel>Proveedor</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Elegir proveedor" /></SelectTrigger></FormControl>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <div className="space-y-2">
            <FormLabel>Materiales Solicitados</FormLabel>
            {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_40px] gap-2 items-end border p-2 rounded-md">
                    <FormField control={form.control} name={`items.${idx}.materialId`} render={({ field }) => (
                        <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger></FormControl>
                            <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${idx}.quantity`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" {...field} placeholder="Cant." /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${idx}.unitPrice`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.01" {...field} placeholder="P. Unit" /></FormControl></FormItem>
                    )} />
                    <Button variant="destructive" size="icon" onClick={() => remove(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: '', quantity: 1, unitPrice: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Item</Button>
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} placeholder="Condiciones de pago, entrega, etc." /></FormControl></FormItem>
        )} />
        <div className="flex justify-between items-center border-t pt-4">
            <div className="text-xl font-bold">Total: ${total.toFixed(2)}</div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
        </div>
      </form>
    </Form>
  );
}
