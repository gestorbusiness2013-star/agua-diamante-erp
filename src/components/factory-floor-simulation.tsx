'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Package, Droplets, Truck, ArrowRight, Activity, Pause, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductionLine {
  id: string;
  name: string;
  status: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number | string;
  status: string;
}

interface FinishedProduct {
  id: string;
  name: string;
  quantity: number;
  zone: string;
}

interface FactoryFloorSimulationProps {
  productionLines: ProductionLine[];
  inventoryItems: InventoryItem[];
  finishedProducts: FinishedProduct[];
}

type TooltipData = {
  title: string;
  lines: { label: string; value: string; alert?: boolean }[];
} | null;

export function FactoryFloorSimulation({
  productionLines,
  inventoryItems,
  finishedProducts,
}: FactoryFloorSimulationProps) {
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  /* ─────────────────────────── derived data ─────────────────────────── */
  const activeLines = productionLines.filter((l) => l.status === 'Activa');
  const pausedLines = productionLines.filter((l) => l.status !== 'Activa');

  const totalRaw = useMemo(
    () =>
      inventoryItems.reduce((sum, item) => {
        const q = Number(String(item.quantity).replace(/\./g, '').replace(',', '.'));
        return sum + (isNaN(q) ? 0 : q);
      }, 0),
    [inventoryItems]
  );
  const lowStockItems = inventoryItems.filter((i) => i.status === 'Stock Bajo');

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
          <div className="bg-card border border-border rounded-xl shadow-2xl p-3 min-w-[180px] max-w-[240px]">
            <p className="text-xs font-bold text-foreground mb-2 border-b border-border pb-1">{tooltip.title}</p>
            {tooltip.lines.map((l, i) => (
              <div key={i} className="flex justify-between items-center gap-3 text-xs py-0.5">
                <span className="text-muted-foreground">{l.label}</span>
                <span className={`font-mono font-semibold ${l.alert ? 'text-orange-400' : 'text-foreground'}`}>{l.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Layout: Exterior + Galpón ── */}
      <div className="flex flex-col lg:flex-row gap-3 min-h-[420px]">

        {/* ═══ EXTERIOR IZQUIERDO – Cisterna ═══ */}
        <div
          className="flex flex-col items-center justify-center gap-3 lg:w-[160px] shrink-0
                     rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 cursor-pointer
                     hover:border-blue-400/60 hover:bg-blue-950/20 transition-all group"
          onMouseEnter={(e) =>
            showTooltip(e, {
              title: 'Bahía Zona D – Cisternas',
              lines: [
                { label: 'Agua cisterna', value: `${totalZoneD.toLocaleString('es-ES')} un.` },
                { label: 'Estado', value: 'En operación' },
                { label: 'Producto', value: zoneD[0]?.name ?? '—' },
              ],
            })
          }
          onMouseMove={moveTooltip}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
            Exterior
          </div>

          {/* Camión esquemático */}
          <div className="relative flex flex-col items-center gap-1">
            {/* Cabina */}
            <div className="w-14 h-9 rounded-tl-xl rounded-tr-md rounded-bl-sm rounded-br-sm
                            bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500/50
                            flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Truck className="h-4 w-4 text-white" />
            </div>
            {/* Cisterna */}
            <div className="w-20 h-7 rounded-full bg-gradient-to-b from-slate-400 to-slate-600
                            border border-slate-300/40 shadow-inner flex items-center justify-center">
              <span className="text-[9px] font-bold text-white/80 tracking-wide">CISTERNA</span>
            </div>
            {/* Manguera animada */}
            <div className="flex items-center gap-0.5 mt-1">
              <div className="w-6 h-1 rounded-full bg-blue-400/70 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" />
            </div>
            {/* Ruedas */}
            <div className="flex gap-6 -mt-1">
              <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-500" />
              <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-500" />
            </div>
          </div>

          {/* Métrica */}
          <div className="mt-2 text-center">
            <div className="text-xs font-bold text-blue-300 font-mono">{totalZoneD.toLocaleString('es-ES')}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">un. agua cisterna</div>
            <Badge variant="outline" className="mt-1 text-[9px] py-0 px-1.5 border-blue-500/40 text-blue-400">
              Zona D
            </Badge>
          </div>

          {/* Flecha hacia interior */}
          <div className="hidden lg:block mt-2">
            <div className="flex items-center gap-1 text-muted-foreground/40 text-[9px]">
              <span>despacho</span>
              <ArrowRight className="h-3 w-3" />
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
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-20 bg-gradient-to-r
                          from-yellow-500/80 to-yellow-400/40 rounded-r-sm">
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-[8px]
                            text-yellow-300/70 font-bold rotate-90 whitespace-nowrap">
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                Producto Terminado
              </div>

              {/* Pallets */}
              <div className="flex flex-col gap-1 flex-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="relative h-8 rounded-lg border border-green-500/30
                               bg-gradient-to-r from-green-950/60 to-green-900/40
                               group-hover:border-green-400/50 transition-colors overflow-hidden"
                  >
                    {/* Pallet stripes */}
                    <div className="absolute inset-0 flex gap-0.5 p-1 opacity-40">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex-1 rounded-sm bg-green-400/50" />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-green-300/90">PALLET</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Métrica */}
              <div className="rounded-lg bg-green-950/40 border border-green-500/20 p-2 text-center">
                <div className="text-sm font-bold text-green-300 font-mono">
                  {totalZoneA.toLocaleString('es-ES')}
                </div>
                <div className="text-[9px] text-muted-foreground">Pack 12 Bot. 600ml</div>
                <Badge className="mt-1 text-[9px] py-0 px-1.5 bg-green-800/60 text-green-300 border-0">
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Líneas de Embotellado
              </div>

              {/* Línea 1 – ACTIVA */}
              {activeLines.slice(0, 1).map((line) => (
                <div
                  key={line.id}
                  className="relative flex-1 rounded-xl border border-green-500/40
                             bg-gradient-to-br from-green-950/60 to-green-900/20
                             p-3 overflow-hidden cursor-pointer
                             hover:border-green-400/60 hover:shadow-green-900/30 hover:shadow-lg transition-all"
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
                  <div className="absolute bottom-3 left-3 right-3 h-3 rounded-full overflow-hidden bg-gray-800/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(90deg, rgba(34,197,94,0.6) 0px, rgba(34,197,94,0.6) 8px, transparent 8px, transparent 16px)',
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
                        className="w-2 h-5 rounded-t-full rounded-b-sm bg-gradient-to-b from-cyan-200 to-cyan-400/60 border border-cyan-300/40"
                        style={{ animation: `bottleBounce 1.2s ease-in-out ${i * 0.24}s infinite` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <p className="text-xs font-bold text-green-300">{line.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Botellas 600ml</p>
                    </div>
                    <Badge className="text-[9px] py-0 px-1.5 bg-green-600/30 text-green-300 border border-green-500/40">
                      🟢 En operación
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Líneas pausadas */}
              {pausedLines.map((line) => (
                <div
                  key={line.id}
                  className="relative rounded-xl border border-border/40 bg-muted/20
                             p-3 cursor-pointer opacity-60
                             hover:opacity-80 hover:border-border/70 transition-all"
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
                  <div className="absolute bottom-3 left-3 right-3 h-3 rounded-full overflow-hidden bg-gray-800/40">
                    <div className="h-full rounded-full bg-gray-700/30" />
                  </div>
                  {/* Botellas estáticas */}
                  <div className="absolute bottom-4.5 left-0 right-0 flex justify-around px-4" style={{ bottom: '18px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 h-5 rounded-t-full rounded-b-sm bg-gray-600/40 border border-gray-500/20" />
                    ))}
                  </div>
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">{line.name}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">Inactiva</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-muted-foreground border-border/50 flex items-center gap-1">
                      <Pause className="h-2.5 w-2.5" /> En pausa
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Líneas de flujo: flechas visuales */}
              <div className="flex justify-center gap-1 items-center opacity-30 py-0.5">
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Droplets className="h-3 w-3" />
                Materia Prima
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
                          ? 'border-orange-500/40 bg-orange-950/30 group-hover:border-orange-400/60'
                          : 'border-border/30 bg-muted/20 group-hover:border-border/60'
                        }`}
                    >
                      <span className="text-sm leading-none">{item.icon}</span>
                      <span className={`text-[10px] font-medium flex-1 ${isAlert ? 'text-orange-300' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                      {isAlert && (
                        <AlertTriangle className="h-3 w-3 text-orange-400 animate-pulse shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Métrica total */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 text-center">
                <div className="text-xs font-bold text-primary font-mono">
                  {totalRaw.toLocaleString('es-ES')}
                </div>
                <div className="text-[9px] text-muted-foreground">unidades totales</div>
                {lowStockItems.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-center gap-1 rounded-md bg-orange-900/30 border border-orange-500/30 px-2 py-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 text-orange-400 animate-pulse" />
                    <span className="text-[9px] font-semibold text-orange-400">
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
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: 'Capacidad activa',
            value: `${productionLines.length > 0 ? Math.round((activeLines.length / productionLines.length) * 100) : 0}%`,
            sub: `${activeLines.length} de ${productionLines.length} líneas`,
            color: 'text-green-400',
            bg: 'bg-green-950/30 border-green-500/20',
          },
          {
            label: 'Materia Prima',
            value: totalRaw.toLocaleString('es-ES'),
            sub: `${lowStockItems.length} alertas activas`,
            color: lowStockItems.length > 0 ? 'text-orange-400' : 'text-primary',
            bg: lowStockItems.length > 0 ? 'bg-orange-950/20 border-orange-500/20' : 'bg-primary/5 border-primary/20',
          },
          {
            label: 'Prod. Terminado',
            value: grandTotal.toLocaleString('es-ES'),
            sub: `Zona A: ${totalZoneA} · Zona D: ${totalZoneD}`,
            color: 'text-cyan-400',
            bg: 'bg-cyan-950/20 border-cyan-500/20',
          },
          {
            label: 'Estado global',
            value: activeLines.length > 0 ? 'Operativa' : 'Pausada',
            sub: activeLines.length > 0 ? 'Producción en curso' : 'Sin líneas activas',
            color: activeLines.length > 0 ? 'text-green-400' : 'text-muted-foreground',
            bg: activeLines.length > 0 ? 'bg-green-950/20 border-green-500/20' : 'bg-muted/20 border-border/30',
          },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-3 ${stat.bg}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{stat.label}</p>
            <p className={`text-sm font-bold font-mono mt-0.5 ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-muted-foreground/70 mt-0.5">{stat.sub}</p>
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
      `}</style>
    </div>
  );
}
