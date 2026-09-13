'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/context/inventory-context';
import { useAuth } from '@/context/auth-context';
import { processVoiceCommand, type VoiceActionResult } from '@/app/actions/voice-action';
import { 
  Mic, MicOff, X, Volume2, VolumeX, Loader2, Sparkles, Check, Play, Square,
  Building, Briefcase, Landmark, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Simple types for local chat history
type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  queryAnswer?: string; // Rich markdown answer
  pendingAction?: {
    type: 'CREATE_EXPENSE' | 'CREATE_CUSTOMER' | 'CREATE_SUPPLIER';
    parameters: any;
  };
};

export function VoiceAssistant() {
  const router = useRouter();
  const { 
    currentUser 
  } = useAuth();
  const {
    inventoryItems,
    finishedProducts,
    sales,
    expenses,
    productionLines,
    customers,
    suppliers,
    addExpense,
    addCustomer,
    addSupplier
  } = useInventory();

  // Assistant states
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Suggested voice commands
  const suggestions = [
    "Ir a ventas",
    "Dime qué stock está bajo",
    "Registrar un gasto de 50 dólares en internet",
    "Ver inventario",
    "Agregar cliente Distribuidora Norte",
    "¿Cuál es el estado de la producción?"
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = 'es-ES';
        rec.interimResults = true;

        rec.onstart = () => {
          setIsListening(true);
          setLiveTranscript('');
          setRecognitionError(null);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          setLiveTranscript(interimTranscript);
          if (finalTranscript) {
            setTranscript(finalTranscript);
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setRecognitionError('Permiso denegado para el micrófono.');
          } else {
            setRecognitionError('Error al reconocer voz. Reintenta.');
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      } else {
        setRecognitionError('Speech Recognition no soportado en este navegador.');
      }
    }

    // Add introductory message
    setMessages([
      {
        id: 'intro',
        sender: 'assistant',
        text: 'Hola, soy Diamante Voice. ¿En qué te puedo ayudar hoy? Puedes pedirme que navegue, registre un gasto, cree un cliente o me puedes consultar información del ERP.'
      }
    ]);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, liveTranscript, isProcessing]);

  // Speech Synthesis helper
  const speakText = (text: string) => {
    if (isMuted || typeof window === 'undefined') return;
    window.speechSynthesis.cancel(); // cancel any active speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setLiveTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Trigger processing when final transcript is captured
  useEffect(() => {
    if (transcript && !isListening) {
      handleSendCommand(transcript);
    }
  }, [transcript, isListening]);

  // Send a command to Gemini Server Action
  const handleSendCommand = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to history
    const userMessageId = Math.random().toString();
    setMessages(prev => [
      ...prev,
      { id: userMessageId, sender: 'user', text }
    ]);

    setIsProcessing(true);
    setTranscript('');
    setLiveTranscript('');

    try {
      // 1. Gather a lightweight summary of database state
      const systemStateSummary = {
        currentPath: window.location.pathname,
        currentUser: currentUser ? { name: currentUser.name, role: currentUser.role } : null,
        inventoryItems: inventoryItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, status: i.status })),
        finishedProducts: finishedProducts.map(fp => ({ name: fp.name, quantity: fp.quantity, zone: fp.zone })),
        recentSales: sales.slice(0, 10).map(s => ({ date: s.date ? new Date(s.date).toLocaleDateString() : '', customerName: s.customerName, total: s.totalAmount, status: s.status })),
        recentExpenses: expenses.slice(0, 10).map(e => ({ description: e.description, amount: e.amount, category: e.category, date: e.date ? new Date(e.date).toLocaleDateString() : '' })),
        productionLines: productionLines.map(pl => ({ name: pl.name, status: pl.status, currentProduct: pl.currentProduct, producedQuantity: pl.producedQuantity || 0 })),
        customers: customers.map(c => ({ name: c.name, contactPerson: c.contactPerson })),
        suppliers: suppliers.map(s => ({ name: s.name })),
      };

      // 2. Call Server Action
      const result: VoiceActionResult = await processVoiceCommand(text, systemStateSummary);

      // 3. Process the AI action
      const responseMessageId = Math.random().toString();
      let pendingActionData = undefined;

      if (result.actionType === 'NAVIGATE' && result.route) {
        router.push(result.route);
      } else if (result.actionType === 'CREATE_EXPENSE' || result.actionType === 'CREATE_CUSTOMER' || result.actionType === 'CREATE_SUPPLIER') {
        pendingActionData = {
          type: result.actionType,
          parameters: result.parameters || {}
        };
      }

      // Add assistant response to history
      setMessages(prev => [
        ...prev,
        {
          id: responseMessageId,
          sender: 'assistant',
          text: result.speakText,
          queryAnswer: result.queryAnswer,
          pendingAction: pendingActionData
        }
      ]);

      // Speak response aloud
      speakText(result.speakText);

    } catch (error) {
      console.error(error);
      const errMsg = 'Error al comunicar con el asistente. Inténtalo de nuevo.';
      setMessages(prev => [
        ...prev,
        { id: Math.random().toString(), sender: 'assistant', text: errMsg }
      ]);
      speakText(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle action confirmation from UI
  const handleConfirmAction = async (msgId: string, action: ChatMessage['pendingAction']) => {
    if (!action) return;

    try {
      if (action.type === 'CREATE_EXPENSE') {
        const { description, amount, category, responsible, date } = action.parameters;
        await addExpense({
          description: description || 'Gasto por voz',
          amount: Number(amount) || 0,
          category: category || 'Otros gastos',
          responsible: responsible || currentUser?.name || 'Asistente de Voz',
          date: date ? new Date(date) : new Date(),
        });
        toast({ title: "Gasto creado con éxito" });
      } else if (action.type === 'CREATE_CUSTOMER') {
        const { name, rif, contactPerson, phone, email, address } = action.parameters;
        await addCustomer({
          name: name || 'Cliente Nuevo',
          rif: rif || 'PENDIENTE',
          contactPerson: contactPerson || name || 'Contacto Principal',
          phone: phone || 'PENDIENTE',
          email: email || 'pendiente@diamante.com',
          address: address || 'Dirección pendiente',
        });
        toast({ title: "Cliente creado con éxito" });
      } else if (action.type === 'CREATE_SUPPLIER') {
        const { name, contactPerson, phone, email, address } = action.parameters;
        await addSupplier({
          name: name || 'Proveedor Nuevo',
          contactPerson: contactPerson || name || 'Contacto Principal',
          phone: phone || 'PENDIENTE',
          email: email || 'pendiente@diamante.com',
          address: address || 'Dirección pendiente',
        });
        toast({ title: "Proveedor creado con éxito" });
      }

      // Update message to remove the action buttons
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            text: '¡Acción confirmada y registrada en el ERP con éxito!',
            pendingAction: undefined
          };
        }
        return m;
      }));

      speakText('Registro completado de forma exitosa.');

    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error al registrar acción', description: err.message });
      speakText('Ocurrió un error al completar el registro.');
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          text: 'Entendido. He cancelado el registro.',
          pendingAction: undefined
        };
      }
      return m;
    }));
    speakText('Acción cancelada.');
  };

  // Custom simple Markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold mt-2 mb-1 text-primary">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-md font-bold mt-3 mb-1 text-primary">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-bold mt-4 mb-2 text-primary">{line.replace('# ', '')}</h2>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-xs text-muted-foreground my-0.5">{line.replace(/^[\s]*[-*]\s+/, '')}</li>;
      }
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={idx} className="text-xs text-muted-foreground my-1 leading-relaxed">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-primary">{part}</strong> : part)}
          </p>
        );
      }
      return <p key={idx} className="text-xs text-muted-foreground my-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      
      {/* Floating Panel */}
      {isOpen && (
        <Card className="w-[320px] sm:w-[380px] h-[480px] flex flex-col bg-background/90 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-primary">Diamante Voice</CardTitle>
                <CardDescription className="text-[10px]">Asistente de Voz Inteligente</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Activar audio" : "Silenciar"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages Body */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 space-y-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    msg.sender === 'user'
                      ? "self-end bg-primary text-primary-foreground rounded-br-none"
                      : "self-start bg-secondary text-secondary-foreground rounded-bl-none border border-secondary"
                  )}
                >
                  {/* Basic Text Response */}
                  <span className="leading-relaxed text-xs sm:text-sm">{msg.text}</span>

                  {/* Rich Markdown Output */}
                  {msg.queryAnswer && (
                    <div className="mt-2 pt-2 border-t border-muted bg-background/50 rounded-lg p-2 overflow-x-auto">
                      {renderMarkdown(msg.queryAnswer)}
                    </div>
                  )}

                  {/* Interactive Confirmation Cards */}
                  {msg.pendingAction && (
                    <div className="mt-3 p-3 bg-background border border-primary/20 rounded-xl space-y-2 text-foreground shadow-sm">
                      <div className="flex items-center gap-1.5 text-primary text-xs font-semibold pb-1.5 border-b">
                        {msg.pendingAction.type === 'CREATE_EXPENSE' && <Landmark className="h-3.5 w-3.5" />}
                        {msg.pendingAction.type === 'CREATE_CUSTOMER' && <Briefcase className="h-3.5 w-3.5" />}
                        {msg.pendingAction.type === 'CREATE_SUPPLIER' && <Building className="h-3.5 w-3.5" />}
                        <span>Confirmar Registro</span>
                      </div>
                      
                      <div className="space-y-1 text-[11px]">
                        {msg.pendingAction.type === 'CREATE_EXPENSE' && (
                          <>
                            <p><strong>Detalle:</strong> {msg.pendingAction.parameters.description}</p>
                            <p><strong>Monto:</strong> ${msg.pendingAction.parameters.amount} USD</p>
                            <p><strong>Categoría:</strong> {msg.pendingAction.parameters.category}</p>
                          </>
                        )}
                        {msg.pendingAction.type === 'CREATE_CUSTOMER' && (
                          <>
                            <p><strong>Nombre:</strong> {msg.pendingAction.parameters.name}</p>
                            <p><strong>RIF:</strong> {msg.pendingAction.parameters.rif}</p>
                            <p><strong>Teléfono:</strong> {msg.pendingAction.parameters.phone}</p>
                          </>
                        )}
                        {msg.pendingAction.type === 'CREATE_SUPPLIER' && (
                          <>
                            <p><strong>Nombre:</strong> {msg.pendingAction.parameters.name}</p>
                            <p><strong>Contacto:</strong> {msg.pendingAction.parameters.contactPerson}</p>
                            <p><strong>Teléfono:</strong> {msg.pendingAction.parameters.phone}</p>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => handleConfirmAction(msg.id, msg.pendingAction)}
                        >
                          Confirmar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 h-7 text-xs border-muted hover:bg-secondary text-muted-foreground"
                          onClick={() => handleCancelAction(msg.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Processing Loader */}
              {isProcessing && (
                <div className="self-start bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none px-3 py-2 text-sm border flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs">Procesando comando...</span>
                </div>
              )}

              {/* Live Speech Feedback */}
              {isListening && liveTranscript && (
                <div className="self-end bg-primary/20 text-foreground italic rounded-2xl rounded-br-none px-3 py-2 text-xs border border-primary/20 max-w-[85%]">
                  {liveTranscript}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested commands chips */}
          <div className="px-4 py-2 border-t bg-secondary/20 flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSendCommand(s)}
                className="text-[10px] bg-background hover:bg-primary/10 hover:text-primary border border-muted-foreground/20 rounded-full px-2.5 py-0.5 text-muted-foreground transition-all duration-150 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Footer controls */}
          <CardFooter className="p-3 border-t flex flex-col items-center gap-2 bg-background">
            
            {/* Waveform / listening state */}
            {isListening ? (
              <div className="flex items-center gap-1.5 h-6 animate-pulse">
                <span className="h-2 w-1.5 bg-primary rounded-full animate-bounce delay-75"></span>
                <span className="h-3 w-1.5 bg-primary rounded-full animate-bounce"></span>
                <span className="h-4 w-1.5 bg-primary rounded-full animate-bounce delay-150"></span>
                <span className="h-3 w-1.5 bg-primary rounded-full animate-bounce"></span>
                <span className="h-2 w-1.5 bg-primary rounded-full animate-bounce delay-75"></span>
                <span className="text-[10px] text-primary font-semibold ml-2">Escuchando...</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground text-center">
                {recognitionError ? (
                  <span className="text-destructive flex items-center gap-1 justify-center">
                    <AlertCircle className="h-3 w-3" /> {recognitionError}
                  </span>
                ) : (
                  "Haz clic en el micrófono y habla en español"
                )}
              </div>
            )}

            {/* Mic button action */}
            <div className="flex items-center gap-3">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg relative border transition-transform duration-200 active:scale-95",
                  !isListening && "bg-gradient-to-tr from-primary to-accent border-none text-primary-foreground hover:opacity-90",
                  isListening && "animate-pulse"
                )}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </div>
          </CardFooter>

        </Card>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground hover:opacity-95 transition-all duration-200 hover:scale-105 active:scale-95 border-none relative flex items-center justify-center group"
          onClick={() => setIsOpen(true)}
        >
          <Mic className="h-6 w-6 group-hover:animate-pulse" />
          <span className="absolute -top-1.5 -right-1 h-3.5 w-3.5 bg-accent rounded-full border border-background animate-ping"></span>
          <span className="absolute -top-1.5 -right-1 h-3.5 w-3.5 bg-accent rounded-full border border-background"></span>
        </Button>
      )}
    </div>
  );
}
