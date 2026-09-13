
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import type { Recipe, FinishedProduct } from '@/lib/inventory-data';

const ZONES = ["Zona A", "Zona B", "Zona C", "Zona D"] as const;

const ingredientSchema = z.object({
  materialName: z.string().min(1, 'Selecciona un material.'),
  quantity: z.coerce.number().positive('La cantidad debe ser positiva.'),
});

const formSchema = z.object({
  productName: z.string().min(1, 'El nombre del producto es requerido.'),
  zone: z.enum(ZONES, { required_error: 'Se requiere una zona.' }),
  quantity: z.coerce.number().min(0, 'La cantidad no puede ser negativa.').default(0),
  ingredients: z.array(ingredientSchema).min(1, 'La receta debe tener al menos un ingrediente.'),
  accessKey: z.string().min(1, 'La clave de acceso es requerida.'),
});

export type RecipeFormValues = z.infer<typeof formSchema>;

interface RecipeFormProps {
  initialData?: { productName: string; ingredients: Recipe, zone: FinishedProduct['zone'], quantity: number } | null;
  rawMaterials: string[];
  onSubmit: (values: RecipeFormValues) => void;
  onClose: () => void;
}

export function RecipeForm({ initialData, rawMaterials, onSubmit, onClose }: RecipeFormProps) {
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: initialData?.productName || '',
      zone: initialData?.zone || 'Zona A',
      quantity: initialData?.quantity || 0,
      ingredients: (initialData && initialData.ingredients && Object.keys(initialData.ingredients).length > 0)
        ? Object.entries(initialData.ingredients).map(([materialName, quantity]) => ({ materialName, quantity }))
        : [{ materialName: '', quantity: 1 }],
      accessKey: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto Terminado</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Agua Saborizada Manzana 1L" {...field} />
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
              <FormLabel>Zona de Almacenamiento</FormLabel>
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
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad {initialData ? 'Actual (en Fábrica)' : 'Inicial'}</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 0" {...field} disabled={!!initialData} />
              </FormControl>
              {initialData ? (
                 <p className="text-xs text-muted-foreground pt-1">La cantidad se modifica mediante órdenes de fabricación y transferencias.</p>
              ) : (
                 <p className="text-xs text-muted-foreground pt-1">Establece la cantidad inicial de este producto en el inventario.</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <h4 className="text-sm font-medium mb-2">Ingredientes de la Receta</h4>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.materialName`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                       <FormLabel>Material</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rawMaterials.map(material => (
                            <SelectItem key={material} value={material}>
                              {material}
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
                  name={`ingredients.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className='w-28'>
                       <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
           <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ materialName: '', quantity: 1 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Ingrediente
            </Button>
            {form.formState.errors.ingredients?.root && (
                 <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.ingredients.root.message}</p>
            )}
        </div>
        <FormField
          control={form.control}
          name="accessKey"
          render={({ field }) => (
            <FormItem className="pt-2">
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
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Producto'}</Button>
        </div>
      </form>
    </Form>
  );
}
