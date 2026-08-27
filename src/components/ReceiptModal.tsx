import React, { useEffect } from 'react';
import { Coffee, Printer, X } from 'lucide-react';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  billNo: string;
  date: string;
  time?: string;
  customerName?: string;
  servedBy?: string;
  items: ReceiptItem[];
  subtotal: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  grandTotal: number;
  paymentMethod?: string;
  cafeName?: string;
  branchLocation?: string;
  logoUrl?: string;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ 
  receipt, 
  onClose,
  autoPrint = false 
}) => {
  if (!receipt) return null;

  const cafeName = receipt.cafeName || 'BrewMaster';
  const branchLocation = receipt.branchLocation || '123 Roaster Avenue\nDowntown District';
  const dateFormatted = receipt.date ? `${receipt.date}${receipt.time ? ` - ${receipt.time}` : ''}` : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const servedBy = receipt.servedBy || receipt.customerName || 'Alex M. (Counter 1)';
  const paymentMethod = receipt.paymentMethod || 'Cash';
  const gstRate = receipt.gstRate !== undefined ? receipt.gstRate : 5;
  const gstAmount = (receipt.cgst || 0) + (receipt.sgst || 0) || Math.round(receipt.subtotal * (gstRate / 100));

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Printable CSS style sheet override for 1-click thermal printing */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-card, #printable-receipt-card * {
            visibility: visible !important;
          }
          #printable-receipt-card {
            position: absolute !important;
            left: 50% !important;
            top: 5px !important;
            transform: translateX(-50%) scale(0.88) !important;
            transform-origin: top center !important;
            width: 58mm !important;
            max-width: 58mm !important;
            box-shadow: none !important;
            border: none !important;
            padding: 4px !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[92vw] sm:max-w-sm p-4 sm:p-6 relative border border-gray-100 flex flex-col items-center max-h-[92vh] overflow-y-auto scrollbar-none">
        
        {/* Close Button (Hidden when printing) */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* THERMAL RECEIPT CARD (Exact UI Match to User Image) */}
        <div id="printable-receipt-card" className="w-full bg-white flex flex-col text-gray-800 font-sans px-2 py-1">
          
          {/* Header Logo & Cafe Name */}
          <div className="flex flex-col items-center text-center mb-3">
            {receipt.logoUrl ? (
              <img src={receipt.logoUrl} alt="Logo" className="w-12 h-12 object-contain mb-1.5" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8b4513] mb-1.5">
                <Coffee className="w-7 h-7 stroke-[2]" />
              </div>
            )}
            
            <h2 className="text-2xl font-extrabold text-[#8b4513] tracking-tight leading-tight">
              {cafeName}
            </h2>
            
            <p className="text-xs text-gray-500 font-medium whitespace-pre-line leading-relaxed mt-1">
              {branchLocation}
            </p>
          </div>

          {/* Dashed Separator Line */}
          <div className="border-b border-dashed border-gray-300 w-full my-2.5"></div>

          {/* Bill Metadata Grid */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Order ID:</span>
              <span className="font-bold text-gray-900">{receipt.billNo}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Date:</span>
              <span className="font-semibold text-gray-700">{dateFormatted}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Served By:</span>
              <span className="font-semibold text-gray-800">{servedBy}</span>
            </div>
          </div>

          {/* Dashed Separator Line */}
          <div className="border-b border-dashed border-gray-300 w-full my-2.5"></div>

          {/* Items Header */}
          <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
            <span className="w-8">Qty</span>
            <span className="flex-1">Items</span>
            <span className="text-right">Total</span>
          </div>

          {/* Items List */}
          <div className="space-y-2 text-xs mb-1">
            {receipt.items.map((item, idx) => {
              const itemTotal = (item.quantity * item.price).toFixed(2);
              return (
                <div key={idx} className="flex justify-between items-start text-gray-900">
                  <span className="w-8 font-bold text-gray-700">{item.quantity}x</span>
                  <span className="flex-1 font-semibold pr-2">{item.name}</span>
                  <span className="text-right font-extrabold">₹{itemTotal}</span>
                </div>
              );
            })}
          </div>

          {/* Dashed Separator Line */}
          <div className="border-b border-dashed border-gray-300 w-full my-2.5"></div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-gray-800">₹{receipt.subtotal.toFixed(2)}</span>
            </div>

            {gstRate > 0 && (
              <div className="flex justify-between text-gray-600 font-medium">
                <span>GST ({gstRate}%)</span>
                <span className="font-bold text-gray-800">₹{gstAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Solid Line */}
            <div className="border-b border-gray-200 my-2"></div>

            {/* Grand Total Highlight */}
            <div className="flex justify-between items-center py-1">
              <span className="text-xl font-extrabold text-[#8b4513]">Grand Total</span>
              <span className="text-2xl font-black text-[#8b4513]">₹{receipt.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Dashed Separator Line */}
          <div className="border-b border-dashed border-gray-300 w-full my-3"></div>

          {/* Payment Pill Badge */}
          <div className="flex justify-center mb-3">
            <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
              Payment: {paymentMethod}
            </span>
          </div>

          {/* Footer Thank You Notes */}
          <div className="text-center text-xs text-gray-500 font-medium space-y-0.5 mt-1">
            <p>Thank you for visiting {cafeName}!</p>
            <p>Come back soon!</p>
          </div>

        </div>

        {/* 1-Click Print & Action Buttons (Hidden when printing) */}
        <div className="no-print w-full flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handlePrint}
            className="flex-1 bg-[#8b4513] hover:bg-[#70370f] text-white font-bold py-3 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Receipt</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
