import type { jsPDF as JsPdfInstance } from 'jspdf';
import { formatPrice } from '@/data/menuData';
import { Transaction } from '@/types/transaction';

const logoPath = '/logo-nostra.png';

export const getReceiptPdfFileName = (transactionId: string) => {
  const safeId = transactionId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return `nota-nostra-caffe-${safeId}.pdf`;
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
};

const loadLogoAsDataUrl = async () => {
  const response = await fetch(logoPath);
  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

const addKeyValue = (doc: JsPdfInstance, label: string, value: string, y: number) => {
  doc.setFont('helvetica', 'normal');
  doc.text(label, 8, y);
  doc.setFont('helvetica', 'bold');
  doc.text(value, 72, y, { align: 'right', maxWidth: 36 });
};

export const createReceiptPdfBlob = async (transaction: Transaction) => {
  const { jsPDF } = await import('jspdf');
  const pageHeight = Math.max(190, 160 + transaction.items.length * 12);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, pageHeight],
  });

  const logoDataUrl = await loadLogoAsDataUrl();
  doc.setTextColor(15, 23, 42);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 28, 8, 24, 24);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Nostra-Caffe', 40, 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Nota Transaksi', 40, 46, { align: 'center' });
  doc.line(8, 51, 72, 51);

  doc.setFontSize(8.5);
  let y = 58;
  addKeyValue(doc, 'ID Transaksi', transaction.id, y);
  y += 7;
  addKeyValue(doc, 'Waktu', formatDateTime(transaction.createdAt), y);
  y += 7;
  addKeyValue(doc, 'Customer', transaction.customerName, y);
  y += 7;
  addKeyValue(doc, 'Metode', transaction.paymentMethod, y);
  y += 7;
  addKeyValue(doc, 'Status Bayar', transaction.paymentStatus, y);
  y += 7;
  addKeyValue(doc, 'Status Pesanan', transaction.orderStatus, y);
  y += 7;
  doc.line(8, y, 72, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Menu', 8, y);
  doc.text('Qty', 43, y, { align: 'center' });
  doc.text('Harga', 56, y, { align: 'right' });
  doc.text('Subtotal', 72, y, { align: 'right' });
  y += 4;
  doc.line(8, y, 72, y);
  y += 6;

  transaction.items.forEach((item) => {
    const nameLines = doc.splitTextToSize(item.name, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(nameLines, 8, y);
    doc.text(String(item.quantity), 43, y, { align: 'center' });
    doc.text(formatPrice(item.price), 56, y, { align: 'right' });
    doc.text(formatPrice(item.subtotal), 72, y, { align: 'right' });
    y += Math.max(7, nameLines.length * 4);
  });

  doc.line(8, y, 72, y);
  y += 7;
  addKeyValue(doc, 'Jumlah item', String(transaction.totalItems), y);
  y += 8;
  doc.setFontSize(11);
  addKeyValue(doc, 'Total', formatPrice(transaction.totalPrice), y);
  y += 9;
  doc.line(8, y, 72, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const thanks = doc.splitTextToSize('Terima kasih telah memesan di Nostra-Caffe.', 62);
  doc.text(thanks, 40, y, { align: 'center' });

  return doc.output('blob');
};

export const downloadReceiptPdf = async (transaction: Transaction) => {
  const blob = await createReceiptPdfBlob(transaction);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getReceiptPdfFileName(transaction.id);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const shareReceiptPdf = async (transaction: Transaction) => {
  const blob = await createReceiptPdfBlob(transaction);
  const fileName = getReceiptPdfFileName(transaction.id);
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const shareData = {
    title: `Nota Nostra-Caffe ${transaction.id}`,
    text: `Nota transaksi ${transaction.id} dari Nostra-Caffe.`,
    files: [file],
  };

  if (navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  return 'unsupported';
};
