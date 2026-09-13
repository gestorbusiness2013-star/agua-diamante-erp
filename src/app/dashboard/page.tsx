
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Factory, Package, Droplets, Warehouse } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { useInventory } from "@/context/inventory-context";
import { format, subMonths, getMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const chartConfig = {
  produced: {
    label: "Producido",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { productionLines, inventoryItems, finishedProducts, movements, warehouses } = useInventory();

  const productionStats = useMemo(() => {
    const activeLines = productionLines.filter(line => line.status === 'Activa').length;
    const totalLines = productionLines.length;
    const capacityPercentage = totalLines > 0 ? Math.round((activeLines / totalLines) * 100) : 0;
    return { activeLines, totalLines, capacityPercentage };
  }, [productionLines]);

  const rawMaterialStats = useMemo(() => {
    const totalUnits = inventoryItems.reduce((sum, item) => {
        const quantity = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
        return sum + (isNaN(quantity) ? 0 : quantity);
    }, 0);
    const lowStockAlerts = inventoryItems.filter(item => item.status === 'Stock Bajo').length;
    return { totalUnits, lowStockAlerts };
  }, [inventoryItems]);

  const finishedProductStats = useMemo(() => {
     const totalUnits = finishedProducts.reduce((sum, product) => sum + product.quantity, 0);
     return { totalUnits };
  }, [finishedProducts]);

  const monthlyProductionData = useMemo(() => {
    const sixMonthsAgo = subMonths(new Date(), 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const productionMovements = movements.filter(
        m => m.type === 'Fabricación' && m.date >= sixMonthsAgo
    );

    const monthlyTotals = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i); // Iterate from 5 months ago to now
        return {
            year: getYear(date),
            month: getMonth(date),
            monthName: format(date, 'MMMM', { locale: es }),
            produced: 0,
        };
    });

    productionMovements.forEach(m => {
        const year = getYear(m.date);
        const month = getMonth(m.date);
        const monthData = monthlyTotals.find(d => d.year === year && d.month === month);
        if (monthData) {
            monthData.produced += m.quantity;
        }
    });

    return monthlyTotals.map(d => ({ 
        month: d.monthName.charAt(0).toUpperCase() + d.monthName.slice(1, 4),
        produced: d.produced 
    }));
  }, [movements]);

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Panel General</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Producción Activa</CardTitle>
                    <Factory className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{productionStats.activeLines} de {productionStats.totalLines} Líneas</div>
                    <p className="text-xs text-muted-foreground">
                      {productionStats.capacityPercentage}% de capacidad de producción activa
                    </p>
                    <Progress value={productionStats.capacityPercentage} className="mt-4" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventario de Materia Prima</CardTitle>
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{rawMaterialStats.totalUnits.toLocaleString('es-ES')} Unidades</div>
                    <p className="text-xs text-muted-foreground">
                      {rawMaterialStats.lowStockAlerts} alertas de stock bajo activas.
                    </p>
                  </CardContent>
                </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Producción Mensual</CardTitle>
                <CardDescription>Resumen de unidades producidas en los últimos 6 meses.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={monthlyProductionData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis tickFormatter={(value) => typeof value === 'number' ? `${value / 1000}k` : ''}/>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="produced" fill="var(--color-produced)" radius={8} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        Stock en Almacenes
                    </CardTitle>
                    <CardDescription>
                        Inventario disponible para la venta en los almacenes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {warehouses.filter(w => w.stock.length > 0).length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {warehouses.filter(w => w.stock.length > 0).map(warehouse => (
                                <AccordionItem value={`warehouse-${warehouse.id}`} key={warehouse.id}>
                                    <AccordionTrigger>{warehouse.name}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2">
                                            {warehouse.stock.map(item => (
                                                 <li key={item.productName} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                                    <span className="text-muted-foreground">{item.productName}</span>
                                                    <span className="font-mono font-semibold text-foreground">{item.quantity.toLocaleString('es-ES')}</span>
                                                 </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                         <div className="flex h-full items-center justify-center pt-10">
                            <p className="text-sm text-muted-foreground">
                                No hay stock en los almacenes.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
             <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Productos Terminados (en Fábrica)
                    </CardTitle>
                    <CardDescription>
                        Stock disponible en las zonas de producción, listo para transferir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-0">
                    <ScrollArea className="h-[280px]">
                    <div className="p-6 pt-0">
                        {finishedProducts.filter((p) => p.quantity > 0).length > 0 ? (
                        <ul className="space-y-4">
                            {finishedProducts
                            .filter((p) => p.quantity > 0)
                            .map((product) => (
                                <li
                                key={product.id}
                                className="border-b pb-4 last:border-b-0"
                                >
                                <p className="font-medium">{product.name}</p>
                                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                                    <span>
                                    Zona: <Badge variant="secondary">{product.zone}</Badge>
                                    </span>
                                    <span className="font-mono text-base font-semibold text-foreground">
                                    {product.quantity.toLocaleString('es-ES')}
                                    </span>
                                </div>
                                </li>
                            ))}
                        </ul>
                        ) : (
                        <div className="flex h-full items-center justify-center pt-10">
                            <p className="text-sm text-muted-foreground">
                            No hay productos terminados en la fábrica.
                            </p>
                        </div>
                        )}
                    </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex-col items-end border-t pt-4 mt-auto">
                    <p className="text-xs text-muted-foreground">Total de Unidades en Fábrica</p>
                    <p className="text-lg font-bold">
                    {finishedProductStats.totalUnits.toLocaleString('es-ES')}
                    </p>
                </CardFooter>
            </Card>
        </div>
      </div>
    </>
  );
}
