'use server';

import {
  simulateProductionQuantity,
  type SimulateProductionQuantityOutput,
} from '@/ai/flows/simulate-production-quantity';
import { z } from 'zod';

const formSchema = z.object({
  currentProductionRate: z.coerce.number().positive({ message: 'La tasa de producción debe ser un número positivo.' }),
  historicalProductionData: z.string().min(1, { message: 'Se requieren datos históricos.' }),
  forecastHorizonDays: z.coerce.number().int().positive({ message: 'El horizonte de previsión debe ser un número entero positivo.' }),
});

export type SimulationState = {
  message?: string | null;
  data?: SimulateProductionQuantityOutput | null;
  errors?: {
    currentProductionRate?: string[];
    historicalProductionData?: string[];
    forecastHorizonDays?: string[];
    _server?: string[];
  } | null;
};

export async function runSimulation(
  formData: FormData
): Promise<SimulationState> {
  const validatedFields = formSchema.safeParse({
    currentProductionRate: formData.get('currentProductionRate'),
    historicalProductionData: formData.get('historicalProductionData'),
    forecastHorizonDays: formData.get('forecastHorizonDays'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error en los datos del formulario.',
      data: null,
    };
  }
  
  try {
    JSON.parse(validatedFields.data.historicalProductionData);
  } catch (e) {
    return {
      errors: { historicalProductionData: ['El formato JSON de los datos históricos no es válido.'] },
      message: 'Error en los datos del formulario.',
      data: null,
    };
  }


  try {
    const result = await simulateProductionQuantity(validatedFields.data);
    return { message: 'Simulación completada con éxito.', data: result, errors: null };
  } catch (error) {
    console.error(error);
    return {
      message: 'La simulación ha fallado.',
      errors: { _server: ['Ocurrió un error inesperado durante la simulación. Por favor, inténtelo de nuevo.'] },
      data: null,
    };
  }
}
