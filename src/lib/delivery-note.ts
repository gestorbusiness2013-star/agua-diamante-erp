import type { Warehouse } from '@/lib/inventory-data';
import type { TransferFormValues } from '@/components/transfer-form';

export const generateDeliveryNotePDF = async (data: TransferFormValues, transferId: string, warehouses: Warehouse[]) => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const QRCode = (await import('qrcode')).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const halfPage = pageHeight / 2;

    let qrDataUrl = '';
    try {
        qrDataUrl = await QRCode.toDataURL(transferId, { margin: 1 });
    } catch (e) {
        console.error("QR Code Error:", e);
    }

    const drawContent = (yOffset: number, isCopy: boolean) => {
        const warehouseName = warehouses.find(w => String(w.id) === data.warehouseId)?.name || 'N/A';
        const sourceName = data.sourceId === 'factory' ? 'Fábrica' : (warehouses.find(w => String(w.id) === data.sourceId)?.name || 'N/A');
        const transferDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(20);
        doc.text("Nota de Entrega", margin, yOffset + 8);
        doc.setFontSize(11);
        doc.text(`Fecha: ${transferDate}`, pageWidth - margin, yOffset + 8, { align: 'right' });
        doc.text(`Origen: ${sourceName}`, margin, yOffset + 16);
        doc.text(`Destino: ${warehouseName}`, margin, yOffset + 24);
        doc.text(`Chófer: ${data.driverName} (${data.driverId})`, margin, yOffset + 32);
        doc.text(`Vehículo: ${data.vehicleBrand} (${data.vehiclePlate})`, pageWidth / 2, yOffset + 32);

        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 25, yOffset + 12, 25, 25);
            doc.setFontSize(7);
            doc.text("Escanea para recibir", pageWidth - margin - 12.5, yOffset + 39, { align: 'center' });
            doc.text(`CÓD: ${transferId}`, pageWidth - margin - 12.5, yOffset + 43, { align: 'center' });
        }

        (doc as any).autoTable({
            startY: yOffset + 40,
            head: [['Producto', 'Cantidad']],
            body: [[data.productName, new Intl.NumberFormat('es-ES').format(data.quantity)]],
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
            },
        });
        
        const finalY = (doc as any).lastAutoTable.finalY || yOffset + 60;

        doc.setFontSize(10);
        doc.text("Firma del Chófer: ________________________", margin, finalY + 20);
        doc.text("Firma de Recepción: _______________________", pageWidth - margin, finalY + 20, { align: 'right' });

        if (isCopy) {
            doc.saveGraphicsState();
            doc.setFontSize(100);
            doc.setTextColor(150); // Gray color
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.2 }));
            doc.text("COPIA", pageWidth / 2, yOffset + (halfPage / 2), {
                align: 'center',
                angle: 45,
                baseline: 'middle'
            });
            doc.restoreGraphicsState();
        }
    };

    drawContent(margin, false);
    (doc as any).setLineDash([2, 2], 0);
    doc.line(margin, halfPage, pageWidth - margin, halfPage);
    (doc as any).setLineDash([], 0);
    drawContent(halfPage + margin, true);
    
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
};
