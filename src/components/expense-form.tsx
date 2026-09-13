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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { expenseCategories, type Expense } from '@/lib/expenses-data';

const formSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida.'),
  responsible: z.string().min(1, 'El responsable es requerido.'),
  amount: z.coerce.number().positive('El monto en USD debe ser un número positivo.'),
  amountBolivares: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number({ invalid_type_error: "Debe ser un número" }).min(0, 'El monto no puede ser negativo.').optional()
  ),
  category: z.enum(expenseCategories, { required_error: 'Se requiere una categoría.' }),
  date: z.date({ required_error: 'Se requiere una fecha.' }),
});

export type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  initialData?: Expense | null;
  onSubmit: (values: ExpenseFormValues) => void;
  onClose: () => void;
}

export function ExpenseForm({ initialData, onSubmit, onClose }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      amountBolivares: initialData.amountBolivares ?? undefined,
    } : {
      description: '',
      responsible: '', // Sale en blanco por defecto
      amount: 0,
      amountBolivares: undefined,
      category: 'Otros gastos',
      date: new Date(),
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del Gasto</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Pago de servicios" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responsible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RESPONSABLE</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del responsable" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Monto (USD)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="amountBolivares"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Monto (Bs.)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="Opcional" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccione categoría" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha del Gasto</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                      {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={es}
                    captionLayout="dropdown-buttons"
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Gasto'}</Button>
        </div>
      </form>
    </Form>
  );
}
