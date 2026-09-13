
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
import { Textarea } from '@/components/ui/textarea';
import type { Customer, MarketProduct, MarketProductSurvey } from '@/lib/customers-data';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const marketSurveySchema = z.object({
  productId: z.string(),
  productName: z.string(),
  sells: z.boolean().default(false),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  weeklyVolume: z.coerce.number().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  rif: z.string().min(1, 'El RIF o Cédula es requerido.'),
  contactPerson: z.string().min(1, 'El nombre del contacto es requerido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  address: z.string().min(1, 'La dirección es requerida.'),
  geolocation: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  marketSurvey: z.array(marketSurveySchema).optional(),
});

export type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  initialData?: Customer | null;
  marketProducts: MarketProduct[];
  onSubmit: (values: CustomerFormValues) => void;
  onClose: () => void;
}

export function CustomerForm({ initialData, marketProducts, onSubmit, onClose }: CustomerFormProps) {
  const { toast } = useToast();

  const defaultSurveyValues = marketProducts.map(p => {
    const existingSurvey = initialData?.marketSurvey?.find(s => s.productId === p.id);
    return {
      productId: p.id,
      productName: p.name,
      sells: !!existingSurvey,
      purchasePrice: existingSurvey?.purchasePrice,
      sellingPrice: existingSurvey?.sellingPrice,
      weeklyVolume: existingSurvey?.weeklyVolume,
    };
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      rif: initialData?.rif || '',
      contactPerson: initialData?.contactPerson || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      geolocation: initialData?.geolocation || '',
      marketSurvey: defaultSurveyValues,
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "marketSurvey",
  });
  
  const watchMarketSurvey = form.watch('marketSurvey');

  const handleFormSubmit = (values: CustomerFormValues) => {
    // Filter out survey entries where the product is not sold.
    const submittedSurvey = values.marketSurvey
        ?.filter(s => s.sells)
        .map(s => ({
            productId: s.productId,
            purchasePrice: s.purchasePrice || 0,
            sellingPrice: s.sellingPrice || 0,
            weeklyVolume: s.weeklyVolume || 0,
        }));
    
    onSubmit({ ...values, marketSurvey: submittedSurvey as any });
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
        toast({
            variant: "destructive",
            title: "Geolocalización no soportada",
            description: "Tu navegador no permite obtener la ubicación actual.",
        });
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            form.setValue('geolocation', mapsUrl, { shouldValidate: true });
            toast({
                title: "Ubicación Obtenida",
                description: "Se ha establecido la URL de Google Maps.",
            });
        },
        (error) => {
            toast({
                variant: "destructive",
                title: "Error al obtener ubicación",
                description: `No se pudo obtener la ubicación: ${error.message}`,
            });
        }
    );
};


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente o Razón Social</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Supermercado La Esquina" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rif"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RIF o Cédula</FormLabel>
              <FormControl>
                <Input placeholder="e.g., J-12345678-9" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona de Contacto</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ana Rivas" {...field} />
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
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="e.g., +58 212-5551234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico de Contacto</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., compras@cliente.com" {...field} />
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
              <FormLabel>Dirección Fiscal</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Av. Principal, Edif. Centro, Caracas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="geolocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geolocalización (URL de Google Maps)</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl className="flex-grow">
                    <Input placeholder="e.g., https://maps.app.goo.gl/..." {...field} />
                </FormControl>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGetCurrentLocation}
                    aria-label="Obtener ubicación actual"
                >
                    <MapPin className="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator className="my-6" />

        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-base font-semibold">Encuesta de Mercado de Productos</h3>
            <Accordion type="multiple" className="w-full">
               {fields.map((field, index) => {
                 const sellsThisProduct = watchMarketSurvey && watchMarketSurvey[index]?.sells;
                 return (
                    <AccordionItem value={field.id} key={field.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <FormField
                            control={form.control}
                            name={`marketSurvey.${index}.sells`}
                            render={({ field: switchField }) => (
                                <FormItem 
                                    className="flex flex-row items-center gap-4 space-y-0"
                                    onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling
                                >
                                <FormControl>
                                    <Switch
                                    checked={switchField.value}
                                    onCheckedChange={switchField.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                    {field.productName}
                                </FormLabel>
                                </FormItem>
                            )}
                            />
                      </AccordionTrigger>
                      <AccordionContent>
                        {sellsThisProduct && (
                            <div className="space-y-4 pt-2 pl-8">
                               <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`marketSurvey.${index}.purchasePrice`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Precio Compra (USD)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="e.g., 2.50" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                <FormField
                                    control={form.control}
                                    name={`marketSurvey.${index}.sellingPrice`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Precio Venta (USD)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="e.g., 3.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                               </div>
                                <FormField
                                    control={form.control}
                                    name={`marketSurvey.${index}.weeklyVolume`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Volumen Semanal (unidades)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 100" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                 )
               })}
            </Accordion>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Cliente'}</Button>
        </div>
      </form>
    </Form>
  );
}
