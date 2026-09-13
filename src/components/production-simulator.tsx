"use client";

import { useFormStatus } from 'react-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { runSimulation, type SimulationState } from '@/app/actions/production';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import type { ChartConfig } from '@/components/ui/chart';

const initialState: SimulationState = {
  message: null,
  data: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulando...</> : 'Ejecutar Simulación'}
    </Button>
  );
}

const chartConfig = {
  predictedQuantity: {
    label: "Cantidad Prevista",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function ProductionSimulator({ historicalData }: { historicalData: string }) {
  const [state, setState] = useState<SimulationState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const formAction = async (formData: FormData) => {
    const result = await runSimulation(formData);
    setState(result);
  };
  
   useEffect(() => {
    if (state.message?.includes('éxito') && formRef.current) {
        formRef.current.reset();
    }
  }, [state]);

  const predictedData = useMemo(() => {
    if (state.data?.predictedQuantities) {
      try {
        const parsedData = JSON.parse(state.data.predictedQuantities);
        return parsedData.map((d: any) => ({
          ...d,
          timestamp: new Date(d.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          predictedQuantity: Number(d.predictedQuantity)
        }));
      } catch (error) {
        console.error("Failed to parse predicted quantities:", error);
        return [];
      }
    }
    return [];
  }, [state.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Simulador de Producción IA</CardTitle>
          <CardDescription>
            Prevea las cantidades de producción futuras basándose en los datos actuales e históricos.
          </CardDescription>
        </CardHeader>
        <form ref={formRef} action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentProductionRate">Tasa de Producción Actual (unidades/hora)</Label>
              <Input id="currentProductionRate" name="currentProductionRate" type="number" placeholder="e.g., 1500" defaultValue="1500" />
              {state.errors?.currentProductionRate && <p className="text-sm font-medium text-destructive">{state.errors.currentProductionRate[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="forecastHorizonDays">Horizonte de Previsión (días)</Label>
              <Input id="forecastHorizonDays" name="forecastHorizonDays" type="number" placeholder="e.g., 7" defaultValue="7" />
              {state.errors?.forecastHorizonDays && <p className="text-sm font-medium text-destructive">{state.errors.forecastHorizonDays[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="historicalProductionData">Datos Históricos de Producción (JSON)</Label>
              <Textarea 
                id="historicalProductionData" 
                name="historicalProductionData" 
                rows={8} 
                key={historicalData} 
                defaultValue={historicalData} 
              />
              {state.errors?.historicalProductionData && <p className="text-sm font-medium text-destructive">{state.errors.historicalProductionData[0]}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
      
      <div className="space-y-6 xl:col-span-3">
        {state.errors?._server && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error del Servidor</AlertTitle>
                <AlertDescription>{state.errors._server[0]}</AlertDescription>
            </Alert>
        )}
        {state.data?.analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis de la IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{state.data.analysis}</p>
            </CardContent>
          </Card>
        )}
        {predictedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cantidades Previstas</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                    <BarChart accessibilityLayer data={predictedData}>
                        <XAxis dataKey="timestamp" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickFormatter={(value) => typeof value === 'number' ? `${value / 1000}k` : ''}/>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="predictedQuantity" fill="var(--color-primary)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
