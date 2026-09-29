'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Sale } from '@/lib/sales-data';

interface CollectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onConfirm: (paymentData: { method: string; reference?: string; receiptFile?: File | null }) => void;
}

export function CollectPaymentDialog({ open, onOpenChange, sale, onConfirm }: CollectPaymentDialogProps) {
  const [method, setMethod] = useState<string>('Efectivo');
  const [reference, setReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  if (!sale) return null;

  const requiresReceipt = ['Transferencia', 'Pago Móvil', 'Punto de Venta'].includes(method);
  
  const handleConfirm = () => {
    onConfirm({ method, reference, receiptFile });
    setMethod('Efectivo');
    setReference('');
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago Final</DialogTitle>
          <DialogDescription>
            Ingresa los datos del pago restante para la orden {sale.invoiceNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select onValueChange={setMethod} value={method}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                <SelectItem value="Punto de Venta">Punto de Venta</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requiresReceipt && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Número de Referencia</Label>
                <Input 
                  placeholder="Ej. 12345678" 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Comprobante de Pago</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setReceiptFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Sube una imagen o toma una foto del comprobante.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Registrar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
