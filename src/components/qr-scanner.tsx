'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onCancel: () => void;
}

export function QrScanner({ onScanSuccess, onCancel }: QrScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("qr-reader");
                scannerRef.current = html5QrCode;
                
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        if (scannerRef.current?.isScanning) {
                            scannerRef.current.stop().then(() => {
                                onScanSuccess(decodedText);
                            }).catch(err => {
                                console.error("Failed to stop scanner", err);
                                onScanSuccess(decodedText);
                            });
                        }
                    },
                    (errorMessage) => {
                        // ignore background noise errors
                    }
                );
                setIsScanning(true);
            } catch (err: any) {
                console.error("Camera error", err);
                setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="flex flex-col items-center space-y-4">
            {error ? (
                <div className="text-red-500 text-sm p-4 text-center border border-red-200 rounded-md bg-red-50">
                    {error}
                </div>
            ) : (
                <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-primary/20"></div>
            )}
            
            {!isScanning && !error && (
                <div className="flex items-center text-muted-foreground text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando cámara...
                </div>
            )}

            <div className="w-full flex space-x-2 pt-2">
                <Input 
                    placeholder="O ingresa el código manual..." 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                />
                <Button 
                    onClick={() => {
                        if (manualCode.trim()) {
                            if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {});
                            onScanSuccess(manualCode.trim());
                        }
                    }}
                    disabled={!manualCode.trim()}
                >
                    Recibir
                </Button>
            </div>

            <Button variant="outline" onClick={onCancel} className="w-full">
                Cancelar
            </Button>
        </div>
    );
}
