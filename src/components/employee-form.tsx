
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Employee } from '@/lib/payroll-data';
import { Textarea } from '@/components/ui/textarea';

// We omit 'id' as it's generated automatically
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  position: z.string().min(1, 'El cargo es requerido.'),
  monthlySalary: z.coerce.number().positive('El salario debe ser un número positivo.'),
  idNumber: z.string().min(1, 'La cédula es requerida.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  address: z.string().min(1, 'La dirección es requerida.'),
  birthDate: z.date({ required_error: 'La fecha de nacimiento es requerida.' }),
  photoUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  idPhotoUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  cvUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
});

export type EmployeeFormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSubmit: (values: EmployeeFormValues) => void;
  onClose: () => void;
}

export function EmployeeForm({ initialData, onSubmit, onClose }: EmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        photoUrl: initialData.photoUrl || '',
        idPhotoUrl: initialData.idPhotoUrl || '',
        cvUrl: initialData.cvUrl || '',
    } : {
      name: '',
      position: '',
      monthlySalary: 0,
      idNumber: '',
      phone: '',
      address: '',
      birthDate: new Date(),
      photoUrl: '',
      idPhotoUrl: '',
      cvUrl: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la Foto</FormLabel>
              <FormControl>
                <Input placeholder="e.g., https://placehold.co/100x100.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Operador de Línea" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salario Mensual (USD)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 800.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cédula de Identidad</FormLabel>
              <FormControl>
                <Input placeholder="e.g., V-12.345.678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="e.g., +58 412-1234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Calle Principal 123, Caracas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Nacimiento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP', { locale: es })
                      ) : (
                        <span>Elige una fecha</span>
                      )}
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
                    fromYear={1950}
                    toYear={new Date().getFullYear() - 18}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="idPhotoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Foto del Documento de Identidad</FormLabel>
              <FormControl>
                <Input placeholder="e.g., https://placehold.co/400x250.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cvUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del Resumen Curricular (CV)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., /cv/carlos-perez.pdf" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Empleado'}</Button>
        </div>
      </form>
    </Form>
  );
}
