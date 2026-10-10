'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Package, Droplets, Truck, ArrowRight, Activity, Pause, ChevronRight, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductionLine {
  id: string | number;
  name: string;
  status: string;
}

interface InventoryItem {
  id: string | number;
  name: string;
  quantity: number | string;
  status: string;
  unit?: string;
}

interface FinishedProduct {
  id: string | number;
  name: string;
  quantity: number;
  zone: string;
}

interface FactoryFloorSimulationProps {
  productionLines: ProductionLine[];
  inventoryItems: InventoryItem[];
  volumeItems?: InventoryItem[];
  finishedProducts: FinishedProduct[];
}

type TooltipData = {
  title: string;
  lines: { label: string; value: string; alert?: boolean }[];
} | null;

/**
 * Returns true for items measured in volume (litros, m³, galones, etc.)
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

export function FactoryFloorSimulation({
  productionLines,
  inventoryItems,
  volumeItems,
  finishedProducts,
}: FactoryFloorSimulationProps) {
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  /* ─────────────────────────── derived data ─────────────────────────── */
  const activeLines = productionLines.filter((l) => l.status === 'Activa');
  const pausedLines = productionLines.filter((l) => l.status !== 'Activa');

  // Dry inventory only (preformas, tapas, envases, etc.)
  const dryItems = useMemo(
    () => inventoryItems.filter((i) => !isVolumeItem(i)),
    [inventoryItems]
  );

  // Volume inventory (agua de pozo, etc.)
  const volumeList = useMemo(() => {
    const fromProps = volumeItems ?? [];
    const fromInv = inventoryItems.filter((i) => isVolumeItem(i));
    const combined = [...fromProps, ...fromInv];
    return combined.filter(
      (item, idx, arr) => arr.findIndex((t) => t.id === item.id || t.name === item.name) === idx
    );
  }, [inventoryItems, volumeItems]);

  const totalVolumeL = useMemo(() => {
    return volumeList.reduce((sum, item) => {
      const q = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
      return sum + (isNaN(q) ? 0 : q);
    }, 0);
  }, [volumeList]);

  const formattedVolume = useMemo(() => {
    if (totalVolumeL >= 1_000_000) {
      return `${(totalVolumeL / 1_000_000).toFixed(1)}M Lts`;
    }
    if (totalVolumeL >= 1_000) {
      return `${(totalVolumeL / 1_000).toFixed(1)}k Lts`;
    }
    return `${totalVolumeL.toLocaleString('es-ES')} Lts`;
  }, [totalVolumeL]);

  const totalRaw = useMemo(
    () =>
      dryItems.reduce((sum, item) => {
        const q = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
        return sum + (isNaN(q) ? 0 : q);
      }, 0),
    [dryItems]
  );
  const lowStockItems = dryItems.filter((i) => i.status === 'Stock Bajo');

  const zoneA = finishedProducts.filter((p) => p.zone === 'A' || p.zone?.includes('A'));
  const zoneD = finishedProducts.filter((p) => p.zone === 'D' || p.zone?.includes('D'));
  const totalZoneA = zoneA.reduce((s, p) => s + p.quantity, 0);
  const totalZoneD = zoneD.reduce((s, p) => s + p.quantity, 0);
  const grandTotal = finishedProducts.reduce((s, p) => s + p.quantity, 0);

  /* ─────────────────────────── tooltip helpers ─────────────────────────── */
  const showTooltip = (
    e: React.MouseEvent,
    data: TooltipData
  ) => {
    setTooltip(data);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const moveTooltip = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hideTooltip = () => setTooltip(null);

  /* ─────────────────────────── render ─────────────────────────── */
  return (
    <div className="relative w-full select-none">
      {/* ── Global tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <div className="bg-popover border border-border rounded-xl shadow-2xl p-3 min-w-[200px] max-w-[280px]">
            <p className="text-xs font-bold text-foreground mb-2 border-b border-border pb-1">{tooltip.title}</p>
            {tooltip.lines.map((l, i) => (
              <div key={i} className="flex justify-between items-center gap-3 text-xs py-0.5">
                <span className="text-muted-foreground">{l.label}</span>
                <span className={`font-mono font-bold ${l.alert ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{l.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Layout: Exterior + Galpón ── */}
      <div className="flex flex-col lg:flex-row gap-3 min-h-[440px]">

        {/* ═══ EXTERIOR IZQUIERDO – Circuito Hídrico & Llenado de Cisternas (Zona D) ═══ */}
        <div
          className="flex flex-col lg:w-[260px] shrink-0 rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 p-3 cursor-pointer hover:border-cyan-400/60 shadow-lg transition-all group"
          onMouseEnter={(e) =>
            showTooltip(e, {
              title: 'Circuito Hídrico & Bahía de Cisternas (Zona D)',
              lines: [
                { label: 'Proceso', value: 'Pozo → Desbarradores → Tanques → Llenadero' },
                { label: 'Stock disponible', value: `${totalZoneD.toLocaleString('es-ES')} recipientes/cargas (Zona D)` },
                { label: 'Tarifa de despacho', value: '$1.00 cada 1.000 Litros' },
                { label: 'Agua captada', value: formattedVolume },
                { label: 'Estado bahía', value: '🟢 Llenado activo en bahía' },
              ],
            })
          }
          onMouseMove={moveTooltip}
          onMouseLeave={hideTooltip}
        >
          {/* Header exterior con badge de tarifa */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 drop-shadow-sm">
                <Waves className="h-4 w-4 text-cyan-400" />
                Exterior · Zona D
              </div>
              <p className="text-[9.5px] text-slate-300 font-medium">Circuito Hídrico Exterior</p>
            </div>
            {/* Indicador de Tarifa visible */}
            <Badge className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-0 text-[10px] font-mono font-black px-2 py-0.5 shadow-md">
              $1.00 / 1.000 L
            </Badge>
          </div>

          {/* ── Cadena de Proceso Conectada por Tuberías ── */}
          <div className="flex flex-col flex-1 justify-between">
            {/* 1. Pozo Profundo (Captación) */}
            <div
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-cyan-400 transition-colors shadow-sm"
              onMouseEnter={(e) => {
                e.stopPropagation();
                showTooltip(e, {
                  title: '1. Pozo Profundo (Captación)',
                  lines: [
                    { label: 'Proceso', value: 'Captación subterránea primaria' },
                    { label: 'Reserva', value: formattedVolume },
                    { label: 'Estado', value: '🟢 Bombeo activo a desbarradores' },
                  ],
                });
              }}
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center shrink-0 shadow-inner">
                <Waves className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Pozo Profundo</span>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold">{formattedVolume}</span>
                </div>
                <p className="text-[9.5px] text-slate-300 font-medium truncate">Captación de agua cruda</p>
              </div>
            </div>

            {/* Tubería animada 1: Pozo → Desbarradores */}
            <div className="relative flex items-center justify-center h-4 my-0.5">
              <div className="w-1.5 h-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700 shadow-inner">
                <div
                  className="w-full h-full bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-400"
                  style={{
                    backgroundSize: '100% 8px',
                    animation: 'fluidFlow 0.8s linear infinite',
                  }}
                />
              </div>
              <span className="absolute right-2 text-[8.5px] font-mono text-cyan-200 font-bold drop-shadow">↓ agua cruda</span>
            </div>

            {/* 2. Batería de Desbarradores (Desarenadores / Filtración Primaria) */}
            <div
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-blue-400 transition-colors shadow-sm"
              onMouseEnter={(e) => {
                e.stopPropagation();
                showTooltip(e, {
                  title: '2. Batería de Desbarradores',
                  lines: [
                    { label: 'Etapa', value: 'Desarenado y decantación inicial' },
                    { label: 'Función', value: 'Eliminación de sólidos y arenas' },
                    { label: 'Estado', value: '🟢 Flujo continuo sin turbidez' },
                  ],
                });
              }}
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-400/60 flex items-center justify-center gap-0.5 shrink-0 shadow-inner">
                <div className="w-1.5 h-5 rounded-t-sm rounded-b-md bg-gradient-to-b from-slate-300 to-amber-500 border border-slate-400/50" />
                <div className="w-1.5 h-5 rounded-t-sm rounded-b-md bg-gradient-to-b from-slate-300 to-amber-500 border border-slate-400/50" />
                <div className="w-1.5 h-5 rounded-t-sm rounded-b-md bg-gradient-to-b from-slate-300 to-amber-500 border border-slate-400/50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Desbarradores</span>
                  <Badge className="text-[9px] py-0 px-1.5 bg-blue-900 text-blue-100 border border-blue-400 font-bold">
                    Primaria
                  </Badge>
                </div>
                <p className="text-[9.5px] text-slate-300 font-medium truncate">Batería de desarenado</p>
              </div>
            </div>

            {/* Tubería animada 2: Desbarradores → Tanques */}
            <div className="relative flex items-center justify-center h-4 my-0.5">
              <div className="w-1.5 h-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700 shadow-inner">
                <div
                  className="w-full h-full bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-400"
                  style={{
                    backgroundSize: '100% 8px',
                    animation: 'fluidFlow 0.8s linear infinite',
                  }}
                />
              </div>
              <span className="absolute right-2 text-[8.5px] font-mono text-cyan-200 font-bold drop-shadow">↓ agua clarificada</span>
            </div>

            {/* 3. Tanques de Almacenamiento de Agua Tratada */}
            <div
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-cyan-400 transition-colors shadow-sm"
              onMouseEnter={(e) => {
                e.stopPropagation();
                showTooltip(e, {
                  title: '3. Tanques de Agua Tratada',
                  lines: [
                    { label: 'Capacidad', value: 'Batería de tanques de reserva' },
                    { label: 'Calidad', value: 'Agua tratada y desinfectada' },
                    { label: 'Nivel', value: 'Nivel Óptimo (95%)' },
                    { label: 'Distribución', value: 'Llenadero de cisternas y fábrica' },
                  ],
                });
              }}
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-cyan-400/60 relative overflow-hidden shrink-0 shadow-inner flex flex-col justify-end">
                <div
                  className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400/90 relative"
                  style={{ height: '75%' }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-cyan-200"
                    style={{ animation: 'waterWave 2s ease-in-out infinite alternate' }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-black text-white drop-shadow">H₂O</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Tanques Tratada</span>
                  <Badge className="text-[9px] py-0 px-1.5 bg-cyan-900 text-cyan-100 border border-cyan-400 font-bold">
                    Óptimo
                  </Badge>
                </div>
                <p className="text-[9.5px] text-slate-300 font-medium truncate">Pulmón de almacenamiento</p>
              </div>
            </div>

            {/* Tubería animada 3: Tanques → Brazo de Llenado */}
            <div className="relative flex items-center justify-center h-4 my-0.5">
              <div className="w-1.5 h-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700 shadow-inner">
                <div
                  className="w-full h-full bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-400"
                  style={{
                    backgroundSize: '100% 8px',
                    animation: 'fluidFlow 0.8s linear infinite',
                  }}
                />
              </div>
              <span className="absolute right-2 text-[8.5px] font-mono text-cyan-200 font-bold drop-shadow">↓ línea a cisterna</span>
            </div>

            {/* 4. Bahía de Carga / Brazo de Llenado & Camión Cisterna */}
            <div
              className="flex flex-col items-center p-2.5 rounded-xl bg-slate-800/95 border border-slate-700 hover:border-cyan-400/70 transition-colors group relative shadow-md"
              onMouseEnter={(e) => {
                e.stopPropagation();
                showTooltip(e, {
                  title: 'Bahía de Llenado de Cisternas (Zona D)',
                  lines: [
                    { label: 'Proceso', value: 'Pozo → Desbarradores → Tanques → Llenadero' },
                    { label: 'Stock disponible', value: `${totalZoneD.toLocaleString('es-ES')} recipientes/cargas (Zona D)` },
                    { label: 'Tarifa de despacho', value: '$1.00 cada 1.000 Litros' },
                    { label: 'Producto', value: zoneD[0]?.name ?? 'Agua en Cisterna' },
                    { label: 'Brazo de llenado', value: '🟢 Manguera activa conectada' },
                  ],
                });
              }}
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              {/* Brazo de carga (Gantry) sobre el camión */}
              <div className="w-full flex items-center justify-between mb-1 px-1">
                <span className="text-[9px] font-mono font-bold text-cyan-300">Brazo de carga</span>
                {/* Viga y brazo articulado */}
                <div className="relative flex items-center">
                  <div className="h-1.5 w-16 bg-gradient-to-r from-slate-400 to-slate-300 rounded-sm" />
                  {/* Codo y manguera descendente */}
                  <div className="w-1.5 h-3 bg-cyan-400 rounded-b-sm relative -ml-3">
                    <div className="w-full h-full bg-cyan-300 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Camión cisterna esquemático */}
              <div className="relative flex flex-col items-center gap-0.5 my-1 w-full">
                <div className="flex items-end justify-center gap-1 w-full">
                  {/* Cabina camión */}
                  <div className="w-10 h-7 rounded-tl-lg rounded-tr-sm rounded-bl-sm rounded-br-sm bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400/50 flex items-center justify-center shadow-md shadow-blue-950">
                    <Truck className="h-3.5 w-3.5 text-white" />
                  </div>

                  {/* Tanque cisterna con boca de carga alineada */}
                  <div className="relative">
                    {/* Boca superior de llenado con manguera activa */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                      <div className="w-3 h-1.5 bg-yellow-400 rounded-t-sm shadow-sm" />
                      <div className="w-1 h-2 bg-cyan-400 animate-pulse rounded-full" />
                    </div>
                    {/* Cilindro cisterna */}
                    <div className="w-20 h-7 rounded-full bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 border border-slate-300 shadow-inner flex items-center justify-center">
                      <span className="text-[8px] font-black text-slate-900 tracking-wider">CISTERNA</span>
                    </div>
                  </div>
                </div>

                {/* Ruedas camión */}
                <div className="flex gap-4 -mt-1 justify-center w-full">
                  <div className="w-3 h-3 rounded-full bg-gray-950 border-2 border-gray-500 shadow" />
                  <div className="w-3 h-3 rounded-full bg-gray-950 border-2 border-gray-500 shadow" />
                  <div className="w-3 h-3 rounded-full bg-gray-950 border-2 border-gray-500 shadow" />
                </div>
              </div>

              {/* Métricas y tarifa de Zona D */}
              <div className="w-full mt-2 pt-2 border-t border-slate-700 text-center space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-300 font-semibold">Stock Zona D:</span>
                  <span className="font-mono font-black text-cyan-300">{totalZoneD.toLocaleString('es-ES')} cargas</span>
                </div>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-300 font-semibold">Tarifa despacho:</span>
                  <span className="font-mono font-black text-emerald-400">$1.00 / 1.000 L</span>
                </div>
                <Badge className="w-full justify-center text-[9.5px] py-1 border-0 text-emerald-950 font-bold bg-emerald-400 shadow-sm">
                  🟢 Llenado activo en bahía
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ GALPÓN PRINCIPAL ═══ */}
        <div className="flex-1 relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">

          {/* Etiqueta galpón */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase
                          tracking-widest text-muted-foreground/50 z-10">
            🏭 Galpón de Producción
          </div>

          {/* Portón de despacho (izquierda) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-20 bg-amber-400 rounded-r-sm shadow-md">
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-[8px]
                            text-slate-950 font-black rotate-90 whitespace-nowrap tracking-widest">
              PORTÓN
            </div>
          </div>

          {/* ── Interior: tres columnas ── */}
          <div className="flex flex-col lg:flex-row h-full pt-8 pb-3 px-4 lg:px-5 gap-3">

            {/* ── COL 1: Producto Terminado Zona A ── */}
            <div
              className="flex flex-col gap-2 lg:w-[160px] shrink-0 cursor-pointer group"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Zona A – Producto Terminado',
                  lines: [
                    { label: 'Pack 12 Bot. 600ml', value: `${totalZoneA.toLocaleString('es-ES')} un.` },
                    { label: 'Total fábrica', value: `${grandTotal.toLocaleString('es-ES')} un.` },
                    { label: 'Destino', value: 'Portón despacho →' },
                  ],
                })
              }
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Package className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                Producto Terminado
              </div>

              {/* Pallets */}
              <div className="flex flex-col gap-1 flex-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="relative h-8 rounded-lg border border-emerald-400/80
                               bg-emerald-100/80 dark:bg-emerald-950/60
                               group-hover:border-emerald-500 transition-colors overflow-hidden"
                  >
                    {/* Pallet stripes */}
                    <div className="absolute inset-0 flex gap-0.5 p-1 opacity-50">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex-1 rounded-sm bg-emerald-400 dark:bg-emerald-500/40" />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-black text-emerald-950 dark:text-emerald-200 tracking-wider">PALLET</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Métrica */}
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600 p-2 text-center shadow-sm">
                <div className="text-sm font-black text-emerald-900 dark:text-emerald-300 font-mono">
                  {totalZoneA.toLocaleString('es-ES')}
                </div>
                <div className="text-[9px] text-slate-700 dark:text-slate-300 font-medium">Pack 12 Bot. 600ml</div>
                <Badge className="mt-1 text-[9px] py-0 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold border-0 shadow-xs">
                  Zona A
                </Badge>
              </div>

              {/* Flecha flujo: → líneas */}
              <div className="hidden lg:flex items-center justify-end text-muted-foreground/30">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* ── COL 2: Líneas de Embotellado ── */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                Líneas de Embotellado
              </div>

              {/* Línea 1 – ACTIVA */}
              {activeLines.slice(0, 1).map((line) => (
                <div
                  key={line.id}
                  className="relative flex-1 rounded-xl border border-emerald-400 dark:border-emerald-600
                             bg-emerald-50/90 dark:bg-gradient-to-br dark:from-green-950/60 dark:to-green-900/20
                             p-3 overflow-hidden cursor-pointer shadow-sm
                             hover:border-emerald-500 hover:shadow-md transition-all"
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      title: line.name,
                      lines: [
                        { label: 'Estado', value: '🟢 En operación' },
                        { label: 'Capacidad', value: '100%' },
                        { label: 'Producto', value: 'Botellas 600ml' },
                      ],
                    })
                  }
                  onMouseMove={moveTooltip}
                  onMouseLeave={hideTooltip}
                >
                  {/* Faja transportadora animada */}
                  <div className="absolute bottom-3 left-3 right-3 h-3 rounded-full overflow-hidden bg-slate-700 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(90deg, rgba(34,197,94,0.95) 0px, rgba(34,197,94,0.95) 8px, transparent 8px, transparent 16px)',
                        backgroundSize: '32px 100%',
                        animation: 'conveyor 1.2s linear infinite',
                      }}
                    />
                  </div>
                  {/* Botellas */}
                  <div className="absolute bottom-4.5 left-0 right-0 flex justify-around px-4" style={{ bottom: '18px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-5 rounded-t-full rounded-b-sm bg-gradient-to-b from-sky-300 to-sky-500 border border-sky-600 shadow-xs"
                        style={{ animation: `bottleBounce 1.2s ease-in-out ${i * 0.24}s infinite` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <p className="text-xs font-black text-emerald-950 dark:text-emerald-100">{line.name}</p>
                      <p className="text-[9.5px] text-emerald-900 dark:text-emerald-300 font-semibold mt-0.5">Botellas 600ml</p>
                    </div>
                    <Badge className="text-[9.5px] py-0.5 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold border-0 shadow-xs">
                      🟢 En operación
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Líneas pausadas */}
              {pausedLines.map((line) => (
                <div
                  key={line.id}
                  className="relative rounded-xl border border-slate-300 dark:border-border/40 bg-slate-100/70 dark:bg-muted/20
                             p-3 cursor-pointer opacity-70
                             hover:opacity-100 hover:border-slate-400 dark:hover:border-border/70 transition-all"
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      title: line.name,
                      lines: [
                        { label: 'Estado', value: '⏸ En pausa' },
                        { label: 'Capacidad', value: '0%' },
                        { label: 'Activar en', value: '—' },
                      ],
                    })
                  }
                  onMouseMove={moveTooltip}
                  onMouseLeave={hideTooltip}
                >
                  {/* Faja estática */}
                  <div className="absolute bottom-3 left-3 right-3 h-3 rounded-full overflow-hidden bg-slate-400/60 dark:bg-gray-800/40">
                    <div className="h-full rounded-full bg-slate-500/40 dark:bg-gray-700/30" />
                  </div>
                  {/* Botellas estáticas */}
                  <div className="absolute bottom-4.5 left-0 right-0 flex justify-around px-4" style={{ bottom: '18px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 h-5 rounded-t-full rounded-b-sm bg-slate-400 border border-slate-500/40" />
                    ))}
                  </div>
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-muted-foreground">{line.name}</p>
                      <p className="text-[9px] text-slate-600 dark:text-muted-foreground/60 mt-0.5 font-medium">Inactiva</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-slate-700 dark:text-muted-foreground border-slate-300 dark:border-border/50 font-semibold flex items-center gap-1">
                      <Pause className="h-2.5 w-2.5" /> En pausa
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Líneas de flujo: flechas visuales */}
              <div className="flex justify-center gap-1 items-center opacity-40 py-0.5">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <ArrowRight className="h-3 w-3 text-primary" />
                <div className="h-0.5 flex-1 bg-gradient-to-r from-primary via-transparent to-transparent" />
              </div>
            </div>

            {/* ── COL 3: Materia Prima ── */}
            <div
              className="flex flex-col gap-2 lg:w-[170px] shrink-0 cursor-pointer group"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Almacén – Materia Prima',
                  lines: [
                    { label: 'Total unidades', value: totalRaw.toLocaleString('es-ES') },
                    { label: 'Alertas stock bajo', value: `${lowStockItems.length}`, alert: lowStockItems.length > 0 },
                    ...lowStockItems.slice(0, 3).map((i) => ({
                      label: i.name,
                      value: `${Number(String(i.quantity).replace(/\./g, '').replace(',', '.')).toLocaleString('es-ES')}`,
                      alert: true,
                    })),
                  ],
                })
              }
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Droplets className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                Insumos Secos
              </div>

              {/* Items de materia prima */}
              <div className="flex flex-col gap-1.5 flex-1">
                {[
                  { label: 'Envases PET', icon: '🧴' },
                  { label: 'Tapas', icon: '🔘' },
                  { label: 'Etiquetas', icon: '🏷️' },
                  { label: 'Cartón', icon: '📦' },
                ].map((item, i) => {
                  const isAlert = lowStockItems[i];
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-colors
                        ${isAlert
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 group-hover:border-amber-500'
                          : 'border-slate-300 dark:border-border/30 bg-slate-50 dark:bg-muted/20 group-hover:border-slate-400'
                        }`}
                    >
                      <span className="text-sm leading-none">{item.icon}</span>
                      <span className={`text-[10px] font-bold flex-1 ${isAlert ? 'text-amber-950 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {item.label}
                      </span>
                      {isAlert && (
                        <AlertTriangle className="h-3 w-3 text-amber-700 dark:text-amber-400 animate-pulse shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Métrica total */}
              <div className="rounded-lg bg-amber-50/70 dark:bg-primary/5 border border-amber-300 dark:border-primary/20 p-2 text-center shadow-sm">
                <div className="text-xs font-black text-amber-950 dark:text-amber-200 font-mono">
                  {totalRaw.toLocaleString('es-ES')}
                </div>
                <div className="text-[9px] text-slate-700 dark:text-slate-300 font-medium">unidades (piezas)</div>
                {lowStockItems.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-center gap-1 rounded-md bg-amber-600 text-white px-2 py-0.5 shadow-xs">
                    <AlertTriangle className="h-2.5 w-2.5 text-white animate-pulse" />
                    <span className="text-[9px] font-bold">
                      {lowStockItems.length} alertas
                    </span>
                  </div>
                )}
              </div>

              {/* Flecha flujo: ← líneas */}
              <div className="hidden lg:flex items-center justify-start text-muted-foreground/30">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de resumen inferior ── */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          {
            label: 'Capacidad activa',
            value: `${productionLines.length > 0 ? Math.round((activeLines.length / productionLines.length) * 100) : 0}%`,
            sub: `${activeLines.length} de ${productionLines.length} líneas`,
            color: 'text-emerald-800 dark:text-emerald-300',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
            labelColor: 'text-emerald-950 dark:text-emerald-200',
            subColor: 'text-emerald-900/80 dark:text-emerald-300',
          },
          {
            label: 'Insumos Secos',
            value: totalRaw.toLocaleString('es-ES'),
            sub: `${lowStockItems.length} alertas de stock`,
            color: 'text-amber-900 dark:text-amber-300',
            bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
            labelColor: 'text-amber-950 dark:text-amber-200',
            subColor: 'text-amber-900/80 dark:text-amber-300',
          },
          {
            label: 'Pozo / Agua Cruda',
            value: formattedVolume,
            sub: 'Nivel Óptimo · Volumen',
            color: 'text-sky-900 dark:text-sky-300',
            bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800',
            labelColor: 'text-sky-950 dark:text-sky-200',
            subColor: 'text-sky-900/80 dark:text-sky-300',
          },
          {
            label: 'Prod. Terminado',
            value: grandTotal.toLocaleString('es-ES'),
            sub: `Zona A: ${totalZoneA} · Zona D: ${totalZoneD}`,
            color: 'text-blue-900 dark:text-blue-300',
            bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800',
            labelColor: 'text-blue-950 dark:text-blue-200',
            subColor: 'text-blue-900/80 dark:text-blue-300',
          },
          {
            label: 'Estado global',
            value: activeLines.length > 0 ? 'Operativa' : 'Pausada',
            sub: activeLines.length > 0 ? 'Producción en curso' : 'Sin líneas activas',
            color: activeLines.length > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-300',
            bg: activeLines.length > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 dark:bg-muted/30 border-slate-300 dark:border-border',
            labelColor: activeLines.length > 0 ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-200',
            subColor: activeLines.length > 0 ? 'text-emerald-900/80 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400',
          },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-3 shadow-sm ${stat.bg}`}>
            <p className={`text-[10px] uppercase tracking-wider font-bold ${stat.labelColor}`}>{stat.label}</p>
            <p className={`text-base font-black font-mono mt-0.5 ${stat.color}`}>{stat.value}</p>
            <p className={`text-[9.5px] font-semibold mt-0.5 ${stat.subColor}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── CSS animations ── */}
      <style jsx global>{`
        @keyframes conveyor {
          from { background-position: 0 0; }
          to   { background-position: -32px 0; }
        }
        @keyframes bottleBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes waterWave {
          0%   { transform: translateY(0px) scaleY(1); }
          100% { transform: translateY(-2px) scaleY(1.1); }
        }
        @keyframes fluidFlow {
          0%   { background-position: 0 0; }
          100% { background-position: 0 16px; }
        }
      `}</style>
    </div>
  );
}
