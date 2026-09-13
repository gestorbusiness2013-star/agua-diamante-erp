'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VoiceActionOutputSchema = z.object({
  actionType: z.enum(['NAVIGATE', 'CREATE_EXPENSE', 'CREATE_CUSTOMER', 'CREATE_SUPPLIER', 'QUERY_SUMMARY', 'VOICE_ONLY']),
  route: z.string().nullable().describe('El path al que se debe navegar si la acción es NAVIGATE, ej. /dashboard/sales'),
  speakText: z.string().describe('Un mensaje corto y natural en español que el asistente leerá en voz alta para responder al usuario'),
  queryAnswer: z.string().optional().describe('La respuesta detallada a la consulta del usuario en formato Markdown si la acción es QUERY_SUMMARY'),
  parameters: z.record(z.any()).optional().describe('Parámetros extraídos para la creación de registros (ej. descripción, monto, nombre, teléfono, categoría)')
});

export type VoiceActionResult = z.infer<typeof VoiceActionOutputSchema>;

export async function processVoiceCommand(
  transcript: string,
  systemStateSummary: {
    currentPath: string;
    currentUser: { name: string; role: string } | null;
    inventoryItems: Array<{ name: string; quantity: number; unit: string; status: string }>;
    finishedProducts: Array<{ name: string; quantity: number; zone: string }>;
    recentSales: Array<{ date: string; customerName: string; total: number; status: string }>;
    recentExpenses: Array<{ description: string; amount: number; category: string; date: string }>;
    productionLines: Array<{ name: string; status: string; currentProduct: string; producedQuantity: number }>;
    customers: Array<{ name: string; contactPerson: string }>;
    suppliers: Array<{ name: string }>;
  }
): Promise<VoiceActionResult> {
  try {
    const response = await ai.generate({
      prompt: `Eres "Diamante Voice", el asistente de voz inteligente en español para el ERP Agua Diamante.
Analiza la siguiente transcripción de voz del usuario y decide qué acción del ERP se debe ejecutar.

Transcripción de voz: "${transcript}"

Resumen del estado actual del sistema (JSON con datos en tiempo real de inventario, ventas, gastos, etc.):
${JSON.stringify(systemStateSummary, null, 2)}

Reglas de Negocio para Selección de Acción:
1. "NAVIGATE": Si el usuario pide ir, abrir, mostrar, ver o llevarnos a una pantalla o sección.
   Rutas válidas:
   - "/dashboard" (Panel general, métricas generales)
   - "/dashboard/inventory" (Inventario de materia prima, stock)
   - "/dashboard/suppliers" (Proveedores)
   - "/dashboard/compras" (Compras)
   - "/dashboard/customers" (Clientes)
   - "/dashboard/routes" (Rutas de venta)
   - "/dashboard/vendedores" (Vendedores)
   - "/dashboard/warehouses" (Almacenes)
   - "/dashboard/sales" (Ventas, pedidos, facturas)
   - "/dashboard/production" (Producción, fabricar, líneas de producción)
   - "/dashboard/movements" (Movimientos, transferencias)
   - "/dashboard/market-analysis" (Análisis de mercado, productos de mercado)
   - "/dashboard/users" (Usuarios, roles)
   - "/dashboard/gastos" (Gastos, nóminas, egresos)

2. "CREATE_EXPENSE": Si el usuario pide registrar o crear un gasto/compra/pago.
   Parámetros que debes extraer (colócalos en el objeto "parameters"):
   - "description": Concepto o detalle del gasto.
   - "amount": El monto numérico en dólares (USD).
   - "category": Clasifícala estrictamente en una de estas categorías:
     'Remodelaciones' | 'Compra de materiales' | 'Pago de nómina' | 'Mantenimiento de equipos' | 'Otros gastos'
   - "responsible": Nombre del usuario actual (si se especifica en el estado del sistema, o "Asistente de Voz").
   - "date": La fecha actual en formato ISO (ej. "${new Date().toISOString()}").

3. "CREATE_CUSTOMER": Si el usuario pide agregar o registrar un cliente.
   Parámetros que debes extraer (colócalos en el objeto "parameters"):
   - "name": Nombre completo del cliente o empresa.
   - "rif": RIF o número de cédula (si no se dice, usa un RIF simulado ej. "V-12345678-0" o "PENDIENTE").
   - "contactPerson": Persona de contacto (si no se dice, usa el mismo nombre del cliente o "Contacto Principal").
   - "phone": Número telefónico (si no se dice, usa "PENDIENTE").
   - "email": Correo electrónico (si no se dice, usa "correo@ejemplo.com" o "cliente@diamante.com").
   - "address": Dirección (si no se dice, usa "Dirección pendiente").

4. "CREATE_SUPPLIER": Si el usuario pide agregar o registrar un proveedor.
   Parámetros que debes extraer (colócalos en el objeto "parameters"):
   - "name": Nombre del proveedor.
   - "contactName": Persona de contacto.
   - "phone": Teléfono.
   - "email": Correo.
   - "address": Dirección.
   (Si falta alguno de los datos obligatorios para proveedor, usa valores "PENDIENTE" por defecto).

5. "QUERY_SUMMARY": Si el usuario hace preguntas sobre los datos del ERP (ej. "cuánto stock queda de botellas", "cuántas ventas hemos hecho", "dime el estado de la producción", "qué materias primas tienen stock bajo").
   - Debes consultar el resumen del estado del sistema suministrado para responder con precisión y veracidad.
   - Proporciona un resumen corto en "speakText" (máximo 2 líneas de texto fluido para que el sintetizador de voz lo lea) y una respuesta detallada formateada en Markdown para "queryAnswer" (puedes usar listas, tablas sencillas o negritas para estructurar la info en pantalla).

6. "VOICE_ONLY": Si el usuario saluda, agradece o hace preguntas sobre ti que no requieren cambiar la pantalla ni crear registros o consultar datos específicos del ERP (ej. "hola", "quién eres", "gracias").

Genera una respuesta en formato JSON estructurado que cumpla con el esquema indicado.`,
      output: {
        schema: VoiceActionOutputSchema
      }
    });

    if (!response.output) {
      throw new Error('No se recibió salida estructurada del modelo.');
    }

    return response.output;
  } catch (error: any) {
    console.error('Error in processVoiceCommand, running local fallback parser:', error);
    
    // Fallback simple rule-based parser in case of rate limits / quota issues
    const normalized = transcript.toLowerCase().trim();
    
    // 1. Navigation checks
    if (normalized.includes('venta') || normalized.includes('pedido') || normalized.includes('factura')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/sales',
        speakText: 'Navegando a la sección de Ventas.'
      };
    }
    if (normalized.includes('inventario') || normalized.includes('stock') || normalized.includes('materia')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/inventory',
        speakText: 'Abriendo el Inventario de materias primas.'
      };
    }
    if (normalized.includes('proveedor')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/suppliers',
        speakText: 'Cargando la lista de Proveedores.'
      };
    }
    if (normalized.includes('compra')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/compras',
        speakText: 'Redirigiendo a Compras.'
      };
    }
    if (normalized.includes('cliente')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/customers',
        speakText: 'Navegando a Clientes.'
      };
    }
    if (normalized.includes('ruta')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/routes',
        speakText: 'Abriendo Rutas de Venta.'
      };
    }
    if (normalized.includes('vendedor')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/vendedores',
        speakText: 'Cargando Vendedores.'
      };
    }
    if (normalized.includes('almacen') || normalized.includes('bodega')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/warehouses',
        speakText: 'Navegando a Almacenes.'
      };
    }
    if (normalized.includes('producción') || normalized.includes('producir') || normalized.includes('fabricar')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/production',
        speakText: 'Abriendo control de Producción.'
      };
    }
    if (normalized.includes('movimiento') || normalized.includes('transferencia')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/movements',
        speakText: 'Navegando a Movimientos.'
      };
    }
    if (normalized.includes('analisis') || normalized.includes('mercado')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/market-analysis',
        speakText: 'Abriendo Análisis de Mercado.'
      };
    }
    if (normalized.includes('usuario')) {
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/users',
        speakText: 'Redirigiendo a Gestión de Usuarios.'
      };
    }
    if (normalized.includes('gasto') || normalized.includes('nomina') || normalized.includes('egreso') || normalized.includes('pago')) {
      // Check if they want to create a expense even in fallback!
      // Regex search for: registrar gasto de [cantidad] en [concepto]
      // E.g. "registrar gasto de 50 en internet" or "gasto de 50 dolares en luz"
      const amountMatch = normalized.match(/(?:gasto|pago)\s+de\s+(\d+(?:\.\d+)?)/);
      if (amountMatch) {
        const amount = Number(amountMatch[1]);
        // Extract concept (after amount or after "en")
        const enMatch = normalized.split(/\ben\b/);
        let description = 'Gasto registrado por voz';
        if (enMatch.length > 1) {
          description = enMatch[enMatch.length - 1].trim();
        }
        
        return {
          actionType: 'CREATE_EXPENSE',
          route: null,
          speakText: `He preparado el registro de un gasto por ${amount} dólares para la categoría de Otros Gastos. ¿Deseas confirmarlo?`,
          parameters: {
            description: description.charAt(0).toUpperCase() + description.slice(1),
            amount: amount,
            category: 'Otros gastos',
            responsible: systemStateSummary.currentUser?.name || 'Asistente de Voz',
            date: new Date().toISOString()
          }
        };
      }
      
      return {
        actionType: 'NAVIGATE',
        route: '/dashboard/gastos',
        speakText: 'Navegando a la sección de Gastos y Nómina.'
      };
    }
    
    // 2. Query/Greeting fallbacks
    if (normalized.includes('hola') || normalized.includes('buenos dias') || normalized.includes('buenas tardes')) {
      return {
        actionType: 'VOICE_ONLY',
        route: null,
        speakText: '¡Hola! Soy tu asistente de voz. En este momento el servicio de IA de Google está al límite de su cuota, pero puedo ayudarte a navegar usando comandos de voz como "ir a ventas" o "ver inventario".'
      };
    }

    return {
      actionType: 'VOICE_ONLY',
      route: null,
      speakText: 'La API de Gemini está sin cuota temporalmente, pero he activado el modo de comandos de navegación local.',
      queryAnswer: `⚠️ **Aviso de Límite de Cuota**: Se ha superado la cuota de tu clave de API de Gemini.\n\n*He activado el modo de navegación local sin conexión a la IA.*\n\nPuedes usar comandos como:\n- "Ir a ventas"\n- "Ver inventario"\n- "Ver producción"\n- "Registrar un gasto de [monto] en [concepto]"\n\n*Por favor, revisa tus límites en Google AI Studio.*`
    };
  }
}
