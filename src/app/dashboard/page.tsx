
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Factory, Package, Droplets, Warehouse, Waves } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FactoryFloorSimulation } from "@/components/factory-floor-simulation";

/**
 * Returns true for items measured in volume (litros, m³, galones, etc.)
 * These represent water/liquid sources and should NOT be counted as discrete units.
 */
function isVolumeItem(item: { unit?: string; name?: string }): boolean {
  const unit = (item.unit ?? '').toLowerCase().trim();
  const name = (item.name ?? '').toLowerCase();
  const volumeUnits = ['litro', 'litros', 'lts', 'lt', 'l', 'm3', 'm³', 'galon', 'galones', 'gal'];
  const waterKeywords = ['agua', 'pozo', 'cisterna', 'cruda', 'tratada'];
  return (
    volumeUnits.some((u) => unit === u || unit.startsWith(u)) ||
    waterKeywords.some((k) => name.includes(k))
  );
}

export default function DashboardPage() {
  const { productionLines, inventoryItems, finishedProducts, movements, warehouses } = useInventory();

  const productionStats = useMemo(() => {
    const activeLines = productionLines.filter(line => line.status === 'Activa').length;
    const totalLines = productionLines.length;
    const capacityPercentage = totalLines > 0 ? Math.round((activeLines / totalLines) * 100) : 0;
    return { activeLines, totalLines, capacityPercentage };
  }, [productionLines]);

  const rawMaterialStats = useMemo(() => {
    // Only count discrete supply items (preformas, tapas, etiquetas, cartón, etc.)
    const dryItems = inventoryItems.filter((item) => !isVolumeItem(item));
    const volumeItems = inventoryItems.filter((item) => isVolumeItem(item));

    const totalUnits = dryItems.reduce((sum, item) => {
      const quantity = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
      return sum + (isNaN(quantity) ? 0 : quantity);
    }, 0);
    const lowStockAlerts = dryItems.filter((item) => item.status === 'Stock Bajo').length;

    const totalVolumeL = volumeItems.reduce((sum, item) => {
      const quantity = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
      return sum + (isNaN(quantity) ? 0 : quantity);
    }, 0);

    return { totalUnits, lowStockAlerts, totalVolumeL, dryItems, volumeItems };
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {productionStats.capacityPercentage}% de capacidad activa
            </p>
            <Progress value={productionStats.capacityPercentage} className="mt-4" />
          </CardContent>
        </Card>

        {/* ── Insumos secos (preformas, tapas, etc.) ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos de Materia Prima</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rawMaterialStats.totalUnits.toLocaleString('es-ES')}
              <span className="text-sm font-normal text-muted-foreground ml-1">unidades</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {rawMaterialStats.dryItems.length} tipos · {rawMaterialStats.lowStockAlerts} alertas de stock bajo
            </p>
          </CardContent>
        </Card>

        {/* ── Volumen de agua (litros) ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agua de Proceso</CardTitle>
            <Waves className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rawMaterialStats.totalVolumeL >= 1_000_000
                ? `${(rawMaterialStats.totalVolumeL / 1_000_000).toFixed(1)}M`
                : rawMaterialStats.totalVolumeL >= 1_000
                  ? `${(rawMaterialStats.totalVolumeL / 1_000).toFixed(1)}k`
                  : rawMaterialStats.totalVolumeL.toLocaleString('es-ES')}
              <span className="text-sm font-normal text-muted-foreground ml-1">lts</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {rawMaterialStats.volumeItems.length > 0
                ? rawMaterialStats.volumeItems.map((i) => i.name).join(', ')
                : 'Sin fuentes de agua registradas'}
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
              {finishedProductStats.totalUnits.toLocaleString('es-ES')}
              <span className="text-sm font-normal text-muted-foreground ml-1">unidades</span>
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
            inventoryItems={rawMaterialStats.dryItems}
            volumeItems={rawMaterialStats.volumeItems}
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
