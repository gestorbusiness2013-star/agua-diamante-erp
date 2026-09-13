// src/ai/flows/simulate-production-quantity.ts
'use server';

/**
 * @fileOverview Simulates finished product quantities based on production line data.
 *
 * - simulateProductionQuantity - A function that simulates finished product quantities.
 * - SimulateProductionQuantityInput - The input type for the simulateProductionQuantity function.
 * - SimulateProductionQuantityOutput - The return type for the simulateProductionQuantity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateProductionQuantityInputSchema = z.object({
  currentProductionRate: z
    .number()
    .describe('La tasa de producción actual en unidades por hora.'),
  historicalProductionData: z
    .string()
    .describe(
      'Datos históricos de producción como una cadena JSON, incluyendo marcas de tiempo y cantidades de producción.'
    ),
  forecastHorizonDays: z
    .number()
    .describe('El número de días para el cual se va a pronosticar la producción.'),
});
export type SimulateProductionQuantityInput = z.infer<
  typeof SimulateProductionQuantityInputSchema
>;

const SimulateProductionQuantityOutputSchema = z.object({
  predictedQuantities: z
    .string()
    .describe(
      'Cantidades de producción previstas como una cadena JSON, incluyendo marcas de tiempo y cantidades previstas.'
    ),
  analysis: z
    .string()
    .describe('Un análisis de los factores que influyen en el pronóstico de producción, en español.'),
});

export type SimulateProductionQuantityOutput = z.infer<
  typeof SimulateProductionQuantityOutputSchema
>;

export async function simulateProductionQuantity(
  input: SimulateProductionQuantityInput
): Promise<SimulateProductionQuantityOutput> {
  return simulateProductionQuantityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateProductionQuantityPrompt',
  input: {schema: SimulateProductionQuantityInputSchema},
  output: {schema: SimulateProductionQuantityOutputSchema},
  prompt: `Eres un gerente experto en planificación de producción.

Utilizarás la tasa de producción actual, los datos históricos de producción y el horizonte de previsión proporcionados para predecir las futuras cantidades de producción. **Toda tu respuesta y análisis deben estar en español.**

Tasa de Producción Actual: {{{currentProductionRate}}} unidades por hora
Datos Históricos de Producción: {{{historicalProductionData}}}
Horizonte de Previsión: {{{forecastHorizonDays}}} días

Basado en esta información, predice las cantidades de producción para el horizonte de previsión. Incluye un análisis de los factores que influyen en el pronóstico de producción.

Genera las cantidades de producción previstas como una cadena JSON, incluyendo marcas de tiempo y cantidades previstas, así como un análisis de los factores que influyen en el pronóstico de producción.
`,
});

const simulateProductionQuantityFlow = ai.defineFlow(
  {
    name: 'simulateProductionQuantityFlow',
    inputSchema: SimulateProductionQuantityInputSchema,
    outputSchema: SimulateProductionQuantityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
