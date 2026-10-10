
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Factory, Package, Droplets, Warehouse } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FactoryFloorSimulation } from "@/components/factory-floor-simulation";

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

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Panel General</h2>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producción Activa</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionStats.activeLines} de {productionStats.totalLines} Líneas
            </div>
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
            <div className="text-2xl font-bold">
              {rawMaterialStats.totalUnits.toLocaleString('es-ES')} Unidades
            </div>
            <p className="text-xs text-muted-foreground">
              {rawMaterialStats.lowStockAlerts} alertas de stock bajo activas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producto Terminado (Fábrica)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {finishedProductStats.totalUnits.toLocaleString('es-ES')} Unidades
            </div>
            <p className="text-xs text-muted-foreground">
              Stock listo para transferir a almacenes.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Simulación del Galpón ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Simulación Operativa del Galpón
          </CardTitle>
          <CardDescription>
            Vista interactiva del estado de producción, inventario y despacho en tiempo real.
            Pasa el cursor sobre cada zona para ver el detalle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FactoryFloorSimulation
            productionLines={productionLines}
            inventoryItems={inventoryItems}
            finishedProducts={finishedProducts}
          />
        </CardContent>
      </Card>

      {/* ── Almacenes ── */}
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
          {warehouses.filter(w => w.stock && w.stock.some(item => (Number(item.quantity) || 0) > 0)).length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {warehouses
                .filter(w => w.stock && w.stock.some(item => (Number(item.quantity) || 0) > 0))
                .map(warehouse => (
                  <AccordionItem value={`warehouse-${warehouse.id}`} key={warehouse.id}>
                    <AccordionTrigger>{warehouse.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {warehouse.stock
                          .filter(item => (Number(item.quantity) || 0) > 0)
                          .map(item => (
                            <li
                              key={item.productName}
                              className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                            >
                              <span className="text-muted-foreground">{item.productName}</span>
                              <span className="font-mono font-semibold text-foreground">
                                {item.quantity.toLocaleString('es-ES')}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          ) : (
            <div className="flex h-full items-center justify-center pt-10">
              <p className="text-sm text-muted-foreground">No hay stock en los almacenes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
