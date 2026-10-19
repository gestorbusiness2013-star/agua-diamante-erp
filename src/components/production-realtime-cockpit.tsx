'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Sparkles, 
  Plus, 
  Activity, 
  Gauge as GaugeIcon, 
  Package, 
  Droplets, 
  ArrowUpRight, 
  HelpCircle, 
  Bell, 
  Search, 
  Settings2, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  Maximize2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  ComposedChart,
  Line
} from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ProductionLine } from '@/lib/data';

interface ProductionRealtimeCockpitProps {
  lines?: ProductionLine[];
  onUpdateLines?: (lines: ProductionLine[]) => Promise<void>;
  onSwitchToManagement?: () => void;
  onSwitchToRequests?: () => void;
  pendingRequestsCount?: number;
}

// Hourly chart telemetry matching the mockup
const hourlyPerformanceData = [
  { time: '18:00', output: 105, target: 120 },
  { time: '19:00', output: 125, target: 130 },
  { time: '20:00', output: 145, target: 150 },
  { time: '21:00', output: 175, target: 160 },
  { time: '22:00', output: 165, target: 160 },
  { time: '00:00', output: 190, target: 180 },
  { time: '03:00', output: 215, target: 200 },
  { time: '06:00', output: 180, target: 180 },
  { time: '09:00', output: 220, target: 210 },
  { time: '12:00', output: 205, target: 200 },
  { time: '15:00', output: 235, target: 220 },
  { time: '18:00', output: 250, target: 240 },
];

export function ProductionRealtimeCockpit({
  lines = [],
  onUpdateLines,
  onSwitchToManagement,
  onSwitchToRequests,
  pendingRequestsCount = 0,
}: ProductionRealtimeCockpitProps) {
  const { toast } = useToast();

  // Primary active lot & line state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(4200);
  const [targetUnits, setTargetUnits] = useState<number>(50000);
  const [producedUnits, setProducedUnits] = useState<number>(34250);
  const [lotCode, setLotCode] = useState<string>('DM600-248');
  const [productName, setProductName] = useState<string>('DIAMANTE');
  const [productVolume, setProductVolume] = useState<string>('600 mL');
  
  // Real-time KPIs
  const [oee, setOee] = useState<number>(92);
  const [waterUsage, setWaterUsage] = useState<number>(24.5);
  const [capsStatus, setCapsStatus] = useState<string>('Suficiente para 8h');

  // Inspection modal for stations
  const [selectedStation, setSelectedStation] = useState<{
    id: string;
    title: string;
    status: string;
    metrics: { label: string; value: string; status?: 'ok' | 'warning' }[];
    description: string;
  } | null>(null);

  // Dialogs
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(500);
  const [editLotDialogOpen, setEditLotDialogOpen] = useState(false);
  const [tempLotCode, setTempLotCode] = useState(lotCode);
  const [tempTarget, setTempTarget] = useState(targetUnits);
  const [tempSpeed, setTempSpeed] = useState(speed);

  // Live simulation tick when line is running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Simulate subtle speed fluctuation (4180 - 4220)
      const jitter = Math.floor(Math.random() * 21) - 10;
      setSpeed((prev) => Math.min(4800, Math.max(3800, 4200 + jitter)));

      // Gradually increment produced units
      setProducedUnits((prev) => {
        if (prev >= targetUnits) return prev;
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isRunning, targetUnits]);

  // Derived progress percentage
  const progressPercent = useMemo(() => {
    if (targetUnits <= 0) return 0;
    return Math.min(100, Math.round((producedUnits / targetUnits) * 100));
  }, [producedUnits, targetUnits]);

  // Toggle running state
  const handleToggleRunning = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    if (!nextState) {
      setSpeed(0);
      toast({
        title: "Línea de Envasado Pausada",
        description: "El flujo de producción ha sido suspendido temporalmente.",
      });
    } else {
      setSpeed(4200);
      toast({
        title: "Línea de Envasado Reanudada",
        description: "Monitoreo en tiempo real activo a 4,200 botellas/hora.",
      });
    }
  };

  // Add produced progress
  const handleApplyAdvance = () => {
    if (advanceAmount <= 0) return;
    setProducedUnits((prev) => Math.min(targetUnits, prev + advanceAmount));
    setAdvanceDialogOpen(false);
    toast({
      title: "Avance Registrado Exitosamente",
      description: `Se han añadido +${advanceAmount.toLocaleString('es-ES')} botellas al lote ${lotCode}.`,
    });
  };

  // Save edited lot
  const handleSaveLot = () => {
    setLotCode(tempLotCode);
    setTargetUnits(tempTarget);
    setSpeed(tempSpeed);
    setEditLotDialogOpen(false);
    toast({
      title: "Parámetros de Lote Actualizados",
      description: `Lote ${tempLotCode} configurado con meta de ${tempTarget.toLocaleString('es-ES')} unidades.`,
    });
  };

  return (
    <div className="w-full bg-[#070e1b] text-slate-100 rounded-2xl border border-slate-800/90 shadow-2xl p-4 sm:p-6 lg:p-7 select-none transition-all duration-300">
      
      {/* ────────────────────────────────── TOP TITLE & CONTROLS ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Producción en Tiempo Real - Agua Mineral Diamante</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isRunning ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
              {isRunning ? 'EN LÍNEA' : 'PAUSADA'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Línea Principal de Embotellado • Supervisión Automatizada SCADA
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {onSwitchToManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToManagement}
              className="bg-[#0b1626] border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-8"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
              Gestión de Órdenes
            </Button>
          )}

          {onSwitchToRequests && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToRequests}
              className="bg-[#0b1626] border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-8 relative"
            >
              <Package className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              Solicitudes Stock
              {pendingRequestsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────── MAIN GRID ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        
        {/* ────── CARD 1: MONITOREO DE LÍNEA DE ENVASADO (Left, ~65%) ────── */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#0c182b]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
          
          {/* Header of Line Monitoring Card */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>Monitoreo de Línea de Envasado</span>
            </h2>

            {/* Glowing Toggle Switch */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {isRunning ? 'Activo' : 'Detenido'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isRunning}
                onClick={handleToggleRunning}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                  isRunning 
                    ? 'bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.6)]' 
                    : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    isRunning ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Schematic Diagram / Visual Plant Floor Layout */}
          <div className="relative w-full min-h-[220px] sm:min-h-[250px] bg-[#091322]/80 rounded-xl border border-slate-800/90 p-3 sm:p-4 overflow-hidden flex flex-col justify-between">
            
            {/* Background ambient lighting */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Analog Speedometer / Gauge in Top-Right Corner */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-col items-center">
              <div className="relative w-24 h-16 sm:w-28 sm:h-18">
                <svg viewBox="0 0 100 65" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="55%" stopColor="#06b6d4" />
                      <stop offset="85%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  
                  {/* Gauge Track */}
                  <path
                    d="M 15 55 A 35 35 0 0 1 85 55"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  {/* Gauge Active Arc */}
                  <path
                    d="M 15 55 A 35 35 0 0 1 85 55"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="7"
                    strokeDasharray="110"
                    strokeDashoffset={isRunning ? "20" : "110"}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  
                  {/* Tick Marks */}
                  <line x1="18" y1="50" x2="23" y2="48" stroke="#475569" strokeWidth="1" />
                  <line x1="32" y1="28" x2="36" y2="33" stroke="#475569" strokeWidth="1" />
                  <line x1="50" y1="20" x2="50" y2="26" stroke="#475569" strokeWidth="1" />
                  <line x1="68" y1="28" x2="64" y2="33" stroke="#475569" strokeWidth="1" />
                  <line x1="82" y1="50" x2="77" y2="48" stroke="#475569" strokeWidth="1" />

                  {/* Needle */}
                  <g 
                    transform={`rotate(${isRunning ? 38 : -75} 50 55)`} 
                    className="transition-transform duration-700 ease-out origin-[50px_55px]"
                  >
                    <polygon points="48,55 52,55 50,22" fill="#22d3ee" filter="drop-shadow(0 0 4px #06b6d4)" />
                    <circle cx="50" cy="55" r="4.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                </svg>
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-300 -mt-1 tracking-wider">
                {isRunning ? `${speed.toLocaleString('es-ES')} bph` : '0 bph'}
              </span>
            </div>

            {/* TOP ROW STATIONS: 1. Filtros e Ionización & 2. Llenadora de Botellas */}
            <div className="grid grid-cols-12 gap-2 sm:gap-4 relative z-0 pt-1">
              
              {/* STATION 1: Filtros e Ionización */}
              <div 
                onClick={() => setSelectedStation({
                  id: 'filtros',
                  title: 'Filtros Multimedia e Ionización',
                  status: 'Óptimo',
                  description: 'Purificación en cascada: filtro de arena multicapa, carbón activado en bloque, ultrafiltración 0.2 micras y cámara de ozonización ultravioleta.',
                  metrics: [
                    { label: 'Turbidez', value: '0.08 NTU (Norma < 1.0)', status: 'ok' },
                    { label: 'Presión de Entrada', value: '3.8 BAR', status: 'ok' },
                    { label: 'Lámparas UV', value: '100% Eficiencia (4/4)', status: 'ok' },
                    { label: 'Ozono Disuelto', value: '0.4 ppm', status: 'ok' },
                  ]
                })}
                className="col-span-5 sm:col-span-4 cursor-pointer group p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/60"
              >
                {/* Badge Tag */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold mb-2.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Filtros e Ionización
                </div>

                {/* Tanks SVG Illustration */}
                <div className="flex items-center gap-3 relative">
                  {/* OK Status Bubble */}
                  <div className="absolute -left-1 top-6 z-10 px-1.5 py-0.2 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold font-mono">
                    OK
                  </div>

                  <div className="flex items-end gap-1.5 pl-4">
                    {/* Tank 1 */}
                    <div className="w-7 sm:w-8 h-18 sm:h-20 rounded-t-lg rounded-b-md bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border border-cyan-500/40 relative shadow-lg flex flex-col justify-end p-0.5 overflow-hidden">
                      {/* Fluid Level Glass */}
                      <div className="w-1.5 h-12 bg-slate-900 rounded-full mx-auto mb-1 relative overflow-hidden">
                        <div className={`w-full bg-cyan-400 rounded-full transition-all duration-500 ${isRunning ? 'h-10 animate-pulse' : 'h-10'}`} />
                      </div>
                      <div className="w-full h-1 bg-cyan-400/80 rounded-sm" />
                    </div>

                    {/* Tank 2 */}
                    <div className="w-7 sm:w-8 h-18 sm:h-20 rounded-t-lg rounded-b-md bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border border-cyan-500/40 relative shadow-lg flex flex-col justify-end p-0.5 overflow-hidden">
                      <div className="w-1.5 h-12 bg-slate-900 rounded-full mx-auto mb-1 relative overflow-hidden">
                        <div className={`w-full bg-cyan-400 rounded-full transition-all duration-500 ${isRunning ? 'h-9 animate-pulse' : 'h-9'}`} />
                      </div>
                      <div className="w-full h-1 bg-cyan-400/80 rounded-sm" />
                    </div>
                  </div>

                  {/* Connecting Manifold Pipe */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="h-1.5 w-full bg-slate-700 relative overflow-hidden rounded-full">
                      {isRunning && (
                        <div className="h-full w-4 bg-cyan-300 rounded-full animate-[ping_1.5s_infinite]" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">3.8 BAR</span>
                  </div>
                </div>
              </div>

              {/* STATION 2: Llenadora de Botellas */}
              <div 
                onClick={() => setSelectedStation({
                  id: 'llenadora',
                  title: 'Llenadora Isométrica Rotativa',
                  status: 'Operación Continua',
                  description: 'Estación de llenado por gravedad volumétrica con 24 válvulas electromagnéticas y tapadora automática con alimentación de tapas esterilizadas.',
                  metrics: [
                    { label: 'Velocidad Actual', value: `${speed.toLocaleString('es-ES')} botellas/h`, status: 'ok' },
                    { label: 'Precisión de Dosificación', value: '600 mL ± 0.6%', status: 'ok' },
                    { label: 'Válvulas en Operación', value: '24 / 24 OK', status: 'ok' },
                    { label: 'Temperatura de Envasado', value: '12.4 °C', status: 'ok' },
                  ]
                })}
                className="col-span-7 sm:col-span-5 cursor-pointer group p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/60"
              >
                {/* Badge Tag */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold mb-2.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Llenadora de Botellas
                </div>

                {/* Filler Machine Graphic */}
                <div className="relative bg-slate-900/90 rounded-lg p-2.5 border border-slate-700/80 shadow-md">
                  {/* OK Badge on Filler */}
                  <div className="absolute right-2 top-2 px-1.5 py-0.2 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold font-mono">
                    OK
                  </div>

                  {/* Overhead Filler Nozzles */}
                  <div className="w-full h-3 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-700 rounded flex justify-around px-2 mb-1.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-1 h-3 bg-cyan-400/80 rounded-b" />
                    ))}
                  </div>

                  {/* Conveyor Belt with Moving Blue Bottles */}
                  <div className="w-full bg-slate-800/90 rounded-md py-1.5 px-1 flex items-end justify-between relative overflow-hidden border-t border-slate-700">
                    {[1, 2, 3, 4, 5, 6].map((b) => (
                      <div 
                        key={b} 
                        className={`flex flex-col items-center transition-transform ${isRunning ? 'translate-y-0' : ''}`}
                      >
                        {/* Cap */}
                        <div className="w-1.5 h-1 bg-cyan-400 rounded-t-sm" />
                        {/* Clear Blue Bottle Body */}
                        <div className="w-3 h-6 rounded-b bg-gradient-to-b from-cyan-400/60 via-blue-500/70 to-cyan-300/80 border border-cyan-200/40 relative shadow-sm">
                          <div className="absolute inset-x-0 bottom-0.5 h-1 bg-white/40 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Conveyor base track */}
                  <div className="h-1.5 w-full bg-slate-700 rounded-b mt-0.5" />
                </div>
              </div>
            </div>

            {/* PIPELINE CONNECTOR DOWNWARDS */}
            <div className="flex justify-around items-center py-2 px-6">
              <div className="flex-1 border-t-2 border-dashed border-cyan-500/30 relative">
                {isRunning && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-1 bg-cyan-400 rounded-full animate-[ping_2s_infinite]" />
                )}
              </div>
            </div>

            {/* BOTTOM ROW STATIONS: 3. Etiquetadora & 4. Embalaje */}
            <div className="grid grid-cols-12 gap-3 sm:gap-6 pt-1">
              
              {/* STATION 3: Etiquetadora */}
              <div 
                onClick={() => setSelectedStation({
                  id: 'etiquetadora',
                  title: 'Etiquetadora y Control de Visión',
                  status: 'Activo',
                  description: 'Aplicación de etiquetas termoencogibles Diamante 600 mL, fechado de lote por inyección de tinta láser e inspección de presencia y verticalidad por cámara óptica.',
                  metrics: [
                    { label: 'Eficacia de Etiquetado', value: '99.85%', status: 'ok' },
                    { label: 'Rechazos de Visión', value: '0 botellas en este lote', status: 'ok' },
                    { label: 'Bobina de Etiquetas', value: '74% restante (Suficiente)', status: 'ok' },
                    { label: 'Impresión Lote', value: lotCode, status: 'ok' },
                  ]
                })}
                className="col-span-6 cursor-pointer group p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/60 flex items-center justify-between"
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Etiquetadora
                </div>

                <div className="flex items-center gap-2 pr-2">
                  <div className="w-7 h-7 rounded-full border-2 border-cyan-400/80 bg-slate-800 flex items-center justify-center relative">
                    <div className={`w-3 h-3 rounded-full bg-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="px-1.5 py-0.2 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold font-mono">
                    OK
                  </div>
                </div>
              </div>

              {/* STATION 4: Embalaje */}
              <div 
                onClick={() => setSelectedStation({
                  id: 'embalaje',
                  title: 'Embalaje y Paletizado Automático',
                  status: 'Activo',
                  description: 'Termoempacadora de 24 botellas por fardo con film reciclable biodegradable, etiquetado de fardo y robot de paletizado sobre tarima de madera.',
                  metrics: [
                    { label: 'Fardos Empacados', value: `${Math.floor(producedUnits / 24).toLocaleString('es-ES')} packs`, status: 'ok' },
                    { label: 'Temperatura Túnel', value: '185 °C', status: 'ok' },
                    { label: 'Palets Completados', value: `${Math.floor(producedUnits / (24 * 60))} palets`, status: 'ok' },
                    { label: 'Estado Paletizador', value: 'Robot OK', status: 'ok' },
                  ]
                })}
                className="col-span-6 cursor-pointer group p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/60 flex items-center justify-between"
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Embalaje
                </div>

                <div className="flex items-center gap-2 pr-2">
                  <div className="flex gap-1 items-end">
                    <div className="w-5 h-4 bg-amber-800/80 rounded-xs border border-amber-600/50" />
                    <div className="w-5 h-5 bg-amber-800/90 rounded-xs border border-amber-600/50" />
                  </div>
                  <div className="px-1.5 py-0.2 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold font-mono">
                    OK
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ────── CARD 2: LOTES ACTIVOS (Right, ~35%) ────── */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[#0c182b]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Lotes Activos
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTempLotCode(lotCode);
                setTempTarget(targetUnits);
                setTempSpeed(speed);
                setEditLotDialogOpen(true);
              }}
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Ajustar parámetros del lote"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Body: Split Bottle & Lot Details */}
          <div className="flex items-center gap-4 sm:gap-6 my-auto py-2">
            
            {/* Diamante 600ml Official Bottle Photo Display */}
            <div className="relative w-28 sm:w-36 h-56 sm:h-64 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-b from-[#141d2e] via-[#0f1726] to-[#0a101b] border border-cyan-800/40 p-1 shadow-2xl overflow-hidden group">
              {/* Backlight halo glow */}
              <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-xl group-hover:bg-cyan-500/20 transition-all duration-300" />
              
              {/* Official uploaded bottle photo */}
              <img
                src="/diamante-600ml.jpg"
                alt="Agua Mineral Diamante 600 mL"
                className="relative z-10 h-full w-auto object-contain rounded-lg drop-shadow-[0_12px_24px_rgba(6,182,212,0.4)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Right: Lot Information */}
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-wider text-white font-headline leading-tight">
                  {productName}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-cyan-400 tracking-widest uppercase">
                  {productVolume}
                </p>
              </div>

              <div className="pt-0.5">
                <span className="inline-block text-[11px] font-mono font-bold text-cyan-200 bg-slate-800/90 border border-cyan-800/60 px-2 py-0.5 rounded">
                  LOTE: {lotCode}
                </span>
              </div>

              <div className="space-y-1 pt-1 text-xs sm:text-sm">
                <div className="text-slate-300">
                  <span className="text-slate-400">Meta:</span>{' '}
                  <span className="font-semibold text-slate-200">{targetUnits.toLocaleString('es-ES')} uds</span>
                </div>
                
                <div className="text-white font-medium">
                  <span className="text-slate-400">Producido:</span>{' '}
                  <span className="font-bold text-white">
                    {producedUnits.toLocaleString('es-ES')} uds ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Glowing Gradient Progress Bar */}
              <div className="pt-1">
                <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-cyan-900/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)] transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* En proceso speed indicator */}
              <div className="pt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
                <span>
                  {isRunning 
                    ? `En proceso (Velocidad: ${speed.toLocaleString('es-ES')} botellas/hora)` 
                    : 'Pausado (Velocidad: 0 botellas/hora)'
                  }
                </span>
              </div>
            </div>

          </div>

          {/* Quick Action Button */}
          <div className="pt-2 border-t border-slate-800/70 flex justify-end">
            <Button
              size="sm"
              onClick={() => setAdvanceDialogOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 px-3 shadow-md shadow-cyan-900/40"
            >
              <Plus className="h-3 w-3 mr-1" />
              Registrar Avance
            </Button>
          </div>

        </div>

      </div>

      {/* ────────────────────────────────── BOTTOM ROW: 3 CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* ────── CARD 3: RENDIMIENTO Y EFICIENCIA (Bottom Left) ────── */}
        <div className="bg-[#0c182b]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Rendimiento y Eficiencia
            </h2>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Turno Hoy
            </span>
          </div>

          {/* Glowing Recharts Chart matching mockup */}
          <div className="w-full h-44 sm:h-48 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Glowing Cyan Bar Gradient */}
                  <linearGradient id="barGlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                    <stop offset="70%" stopColor="#0284c7" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#0369a1" stopOpacity={0.3} />
                  </linearGradient>

                  {/* Smooth Area Curve Glow */}
                  <linearGradient id="areaCurveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.6} />

                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={5}
                />
                
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  domain={[0, 250]}
                  ticks={[0, 50, 100, 150, 200, 250]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                />

                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0b1626] border border-cyan-800/80 p-2.5 rounded-lg shadow-xl text-xs">
                          <p className="font-mono text-cyan-300 font-bold">{payload[0].payload.time}</p>
                          <p className="text-white font-medium">Producción: <span className="text-cyan-400 font-bold">{payload[0].value} k uds</span></p>
                          <p className="text-slate-400">Meta: {payload[0].payload.target} k uds</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Glowing Bars */}
                <Bar 
                  dataKey="output" 
                  fill="url(#barGlowGradient)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={12}
                />

                {/* Area & Contour Line */}
                <Area 
                  type="monotone" 
                  dataKey="output" 
                  stroke="#22d3ee" 
                  strokeWidth={2.5} 
                  fill="url(#areaCurveGlow)" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ────── CARD 4: INDICADORES CLAVE (Bottom Middle) ────── */}
        <div className="bg-[#0c182b]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-wide">
              Indicadores Clave
            </h2>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="space-y-4 my-auto">
            {/* KPI 1: Eficiencia General (OEE) */}
            <div className="border-b border-slate-800/70 pb-3">
              <div className="text-xs sm:text-sm text-slate-300 font-medium">
                Eficiencia General (OEE):
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.4)] mt-0.5">
                {oee}%
              </div>
            </div>

            {/* KPI 2: Consumo de Agua */}
            <div className="border-b border-slate-800/70 pb-3">
              <div className="text-xs sm:text-sm text-slate-300 font-medium">
                Consumo de Agua:
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.4)] mt-0.5">
                {waterUsage.toLocaleString('es-ES', { minimumFractionDigits: 1 })} m³
              </div>
            </div>

            {/* KPI 3: Materia Prima (Tapas) */}
            <div>
              <div className="text-xs sm:text-sm text-slate-300 font-medium">
                Materia Prima (Tapas):
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight mt-0.5">
                {capsStatus}
              </div>
            </div>
          </div>
        </div>

        {/* ────── CARD 5: AGENTE / AUTOMATIZACIONES DE IA (Bottom Right) ────── */}
        <div className="bg-[#0c182b]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Agente / Automatizaciones de IA</span>
            </h2>
          </div>

          <div className="space-y-3.5 my-auto">
            
            {/* Automation Item 1: Maintenance Alert */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-cyan-900/40 hover:border-cyan-700/60 transition-all">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-xs sm:text-sm text-slate-200 leading-snug">
                <span className="font-semibold text-cyan-300">IA:</span> Programación óptima de mantenimiento preventivo para el viernes a las 04:00 AM (sin impacto en entregas)
              </div>
            </div>

            {/* Automation Item 2: Quality Inspection */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-cyan-900/40 hover:border-cyan-700/60 transition-all">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
                <Truck className="h-4 w-4" />
              </div>
              <div className="text-xs sm:text-sm text-slate-200 leading-snug">
                <span className="font-semibold text-cyan-300">Control de calidad automatizado:</span> 100% de botellas aprobadas en el último lote
              </div>
            </div>

          </div>

          <div className="pt-2 text-right">
            <span className="text-[11px] text-cyan-400/80 hover:text-cyan-300 cursor-pointer inline-flex items-center gap-1 font-medium">
              Ver registros de IA
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

      </div>

      {/* ────────────────────────────────── MODAL: STATION TELEMETRY INSPECTION ────────────────────────────────── */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
        <DialogContent className="sm:max-w-lg bg-[#0b1626] border border-cyan-900/60 text-slate-100">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold w-fit mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {selectedStation?.status}
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              {selectedStation?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {selectedStation?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-3">
            {selectedStation?.metrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[11px] text-slate-400">{m.label}</p>
                <p className="text-sm font-bold text-cyan-300 font-mono mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStation(null)}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────── MODAL: REGISTRAR AVANCE ────────────────────────────────── */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0b1626] border border-cyan-900/60 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Registrar Unidades Producidas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Ingresa la cantidad de botellas terminadas para sumar al lote {lotCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="advance-amount" className="text-slate-200">Cantidad a Sumar (unidades)</Label>
              <Input
                id="advance-amount"
                type="number"
                min="1"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white font-mono text-base"
              />
            </div>

            <div className="flex gap-2">
              {[250, 500, 1000, 2500].map((quick) => (
                <Button
                  key={quick}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdvanceAmount(quick)}
                  className="flex-1 bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-xs"
                >
                  +{quick.toLocaleString('es-ES')}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAdvanceDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyAdvance}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Confirmar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────── MODAL: CONFIGURAR LOTE ────────────────────────────────── */}
      <Dialog open={editLotDialogOpen} onOpenChange={setEditLotDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0b1626] border border-cyan-900/60 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-cyan-400" />
              Configurar Lote y Parámetros
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Modifica los identificadores y metas de la línea de embotellado activa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-200">Código de Lote</Label>
              <Input
                value={tempLotCode}
                onChange={(e) => setTempLotCode(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Meta Total (uds)</Label>
              <Input
                type="number"
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Velocidad Nominal (botellas/hora)</Label>
              <Input
                type="number"
                value={tempSpeed}
                onChange={(e) => setTempSpeed(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditLotDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLot}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
