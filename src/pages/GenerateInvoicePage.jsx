import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PROFILE_KEY = 'invoice_profile';

// Design coordinate space (A4 at 96dpi)
const DESIGN_CANVAS = { W: 794, H: 1123 };

// Template image size (matches the actual PNG dimensions)
const CANVAS = { W: 1149, H: 1369 };

const SCALE = {
  x: CANVAS.W / DESIGN_CANVAS.W,
  y: CANVAS.H / DESIGN_CANVAS.H,
};

const DEFAULT_PROFILE = {
  phone: '',
  email: '',
  website: '',
  location: '',
  accountNumber: '',
  accountTitle: '',
  bankName: '',
  iban: '',
  swift: '',
  paymentMethod: '',
  footerName: '',
  footerNTN: '',
};

const DEFAULT_INVOICE = {
  clientName: '',
  companyName: '',
  address: '',
  clientEmail: '',
  clientPhone: '',
  companyNumber: '',
  vat: '',
  invoiceNo: '',
  invoiceDate: '',
  dueDate: '',
  currency: '',
  paymentTerms: '',
  discount: '',
  notes: '',
};

// Absolute pixel positions for text overlays on the design canvas (794x1123)
const OVERLAYS = {
  headerPhone:        { x: 580, y: 40,  w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  headerEmail:        { x: 580, y: 75,  w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  headerWebsite:      { x: 580, y: 108, w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  headerLocation:     { x: 580, y: 134, w: 200, fontSize: 13, fontWeight: 500, color: '#1f2937', wrap: true, maxLines: 2, lineHeight: 18 },

//   billClientName:     { x: 120, y: 287, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billCompanyName:    { x: 139, y: 308, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billAddress:        { x: 98, y: 329, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billEmail:          { x: 85, y: 349, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billPhone:          { x: 85, y: 368, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billCompanyNumber:  { x: 150, y: 388, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
//   billVat:            { x: 75, y: 409, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },

  billClientName:     { x: 160, y: 287, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billCompanyName:    { x: 160, y: 308, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billAddress:        { x: 160, y: 329, w: 320, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billEmail:          { x: 160, y: 349, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billPhone:          { x: 160, y: 368, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billCompanyNumber:  { x: 160, y: 388, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  billVat:            { x: 160, y: 409, w: 260, fontSize: 13, fontWeight: 500, color: '#1f2937' },

  invoiceNo:          { x: 620, y: 303, w: 170, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  invoiceDate:        { x: 620, y: 328, w: 170, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  dueDate:            { x: 620, y: 353, w: 170, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  currency:           { x: 620, y: 378, w: 170, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentTerms:       { x: 620, y: 401, w: 170, fontSize: 13, fontWeight: 500, color: '#1f2937' },

  paymentAccountNo:   { x: 160, y: 795, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentAccountTitle:{ x: 160, y: 813, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentBankName:    { x: 160, y: 830, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentIban:        { x: 160, y: 848, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentSwift:       { x: 160, y: 864, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  paymentMethod:      { x: 160, y: 882, w: 250, fontSize: 13, fontWeight: 500, color: '#1f2937' },

  footerName:         { x: 185, y: 1060, w: 200, fontSize: 12, fontWeight: 900, color: '#0a1f44', align: 'center', uppercase: true },
  footerNTN:          { x: 405, y: 1055, w: 120, fontSize: 15, fontWeight: 700, color: '#1f2937', align: 'center' },
};

const InputGroup = ({ label, field, value, onChange, type = 'text', placeholder }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(field, e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-left focus:border-[#0a1f44] focus:outline-none focus:ring-1 focus:ring-[#0a1f44]"
    />
  </div>
);

const ReadOnlyRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <span className="text-xs font-semibold text-gray-500">{label}</span>
    <span className="text-xs text-gray-800 text-right break-all">{value || '—'}</span>
  </div>
);

const AbsText = ({ config, value, devMode }) => {
  if (!value) return null;

  const scaledX = Math.round(config.x * SCALE.x);
  const scaledY = Math.round(config.y * SCALE.y);
  const scaledW = Math.round(config.w * SCALE.x);
  const scaledFontSize = Math.round(config.fontSize * SCALE.y);

  const textBoxHeight = Math.ceil(scaledFontSize * 1.5);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${scaledX}px`,
        top: `${scaledY-2}px`,
        width: `${scaledW}px`,
        height: config.wrap ? (config.maxLines ? `${Math.ceil(config.lineHeight * SCALE.y * config.maxLines) + 20}px` : 'auto') : `${textBoxHeight}px`,
        fontSize: `${scaledFontSize}px`,
        fontWeight: config.fontWeight,
        color: config.color,
        textAlign: config.align || 'left',
        textTransform: config.uppercase ? 'uppercase' : 'none',
        whiteSpace: config.wrap ? 'pre-wrap' : 'nowrap',
        overflow: config.wrap ? 'visible' : 'hidden',
        textOverflow: config.wrap ? 'clip' : 'ellipsis',
        display: 'block',
        lineHeight: config.lineHeight ? `${Math.round(config.lineHeight * SCALE.y)}px` : `${scaledFontSize}px`,
        fontFamily: 'Arial, Helvetica, sans-serif',
        transform: 'translateY(-2px)',
        textIndent: config.textIndent ? `${Math.round(config.textIndent * SCALE.x)}px` : '0',
        border: devMode ? '1px dashed red' : 'none',
        backgroundColor: devMode ? 'rgba(255,0,0,0.08)' : 'transparent',
        zIndex: 2,
      }}
    >
      {value}
    </div>
  );
};

const AddItemModal = ({ isOpen, onClose, onAdd, initialItem = null }) => {
  const [item, setItem] = useState({ description: '', qty: '', rate: '', amount: '' });

  // Update internal state when modal opens or initialItem changes
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setItem(initialItem);
      } else {
        setItem({ description: '', qty: '', rate: '', amount: '' });
      }
    }
  }, [isOpen, initialItem]);

  // Auto calculate amount when qty and rate change
  useEffect(() => {
    const q = parseFloat(item.qty);
    const r = parseFloat(item.rate);
    if (!isNaN(q) && !isNaN(r)) {
      setItem(prev => ({ ...prev, amount: (q * r).toFixed(2) }));
    }
  }, [item.qty, item.rate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
        <h3 className="text-lg font-bold text-[#0a1f44] mb-4">{initialItem ? 'Edit Item' : 'Add Item'}</h3>
        <InputGroup label="Description of Service" field="description" value={item.description} onChange={(f, v) => setItem({...item, [f]: v})} />
        <div className="flex gap-4">
          <div className="flex-1">
             <InputGroup label="Qty" field="qty" type="number" value={item.qty} onChange={(f, v) => setItem({...item, [f]: v})} />
          </div>
          <div className="flex-1">
             <InputGroup label="Rate" field="rate" type="number" value={item.rate} onChange={(f, v) => setItem({...item, [f]: v})} />
          </div>
        </div>
        <InputGroup label="Amount" field="amount" value={item.amount} onChange={(f, v) => setItem({...item, [f]: v})} />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button
            onClick={() => {
              onAdd(item);
              onClose();
            }}
            className="px-4 py-2 text-sm bg-[#0a1f44] text-white rounded hover:bg-[#081a38]"
          >
            {initialItem ? 'Save Changes' : 'Add Row'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GenerateInvoicePage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [invoice, setInvoice] = useState(DEFAULT_INVOICE);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [fitPreview, setFitPreview] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewWrapRef = useRef(null);
  const captureRef = useRef(null);

  const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const discountPercent = parseFloat(invoice.discount) || 0;
  const discountVal = subTotal * (discountPercent / 100);
  const total = Math.max(0, subTotal - discountVal);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse invoice_profile', error);
      }
    }

    // Fetch unique invoice number on load
    fetch('/api/invoice-number')
      .then(res => res.json())
      .then(data => {
        if (data.invoiceNo) {
          setInvoice(prev => ({ ...prev, invoiceNo: data.invoiceNo }));
        }
      })
      .catch(err => console.error('Failed to fetch invoice number', err));
  }, []);

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return undefined;

    const updateScale = () => {
      const width = el.clientWidth;
      if (!width) return;
      const nextScale = Math.min(1, width / CANVAS.W);
      setPreviewScale(nextScale);
    };

    updateScale();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }

    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleChange = (field, value) => {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownloadPdf = async () => {
    if (!captureRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      // Save invoice number to backend to prevent duplicates
      if (invoice.invoiceNo) {
        await fetch('/api/save-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNo: invoice.invoiceNo })
        }).catch(err => console.error('Failed to save invoice number', err));
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        letterRendering: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [CANVAS.W, CANVAS.H],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, CANVAS.W, CANVAS.H);
      pdf.save('invoice.pdf');
    } catch (error) {
      console.error('Failed to download PDF', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const effectiveScale = fitPreview ? previewScale : 1;
  const scaledWidth = Math.round(CANVAS.W * effectiveScale);
  const scaledHeight = Math.round(CANVAS.H * effectiveScale);

  const PreviewCanvas = ({ scale, innerRef, showDevMode, withShadow = true }) => {
    const scaledW = Math.round(CANVAS.W * scale);
    const scaledH = Math.round(CANVAS.H * scale);

    return (
      <div style={{ width: `${scaledW}px`, height: `${scaledH}px` }}>
        <div
          ref={innerRef}
          className={`bg-white relative ${withShadow ? 'shadow-2xl' : ''}`}
          style={{
            width: `${CANVAS.W}px`,
            height: `${CANVAS.H}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundImage: 'url("/Invoice_template.png")',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Header contact from profile */}
          <AbsText config={OVERLAYS.headerPhone} value={profile.phone} devMode={showDevMode} />
          <AbsText config={OVERLAYS.headerEmail} value={profile.email} devMode={showDevMode} />
          <AbsText config={OVERLAYS.headerWebsite} value={profile.website} devMode={showDevMode} />
          <AbsText config={OVERLAYS.headerLocation} value={profile.location} devMode={showDevMode} />

          {/* Bill To values */}
          <AbsText config={OVERLAYS.billClientName} value={invoice.clientName} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billCompanyName} value={invoice.companyName} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billAddress} value={invoice.address} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billEmail} value={invoice.clientEmail} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billPhone} value={invoice.clientPhone} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billCompanyNumber} value={invoice.companyNumber} devMode={showDevMode} />
          <AbsText config={OVERLAYS.billVat} value={invoice.vat} devMode={showDevMode} />

          {/* Invoice info values */}
          <AbsText config={OVERLAYS.invoiceNo} value={invoice.invoiceNo} devMode={showDevMode} />
          <AbsText config={OVERLAYS.invoiceDate} value={invoice.invoiceDate} devMode={showDevMode} />
          <AbsText config={OVERLAYS.dueDate} value={invoice.dueDate} devMode={showDevMode} />
          <AbsText config={OVERLAYS.currency} value={invoice.currency} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentTerms} value={invoice.paymentTerms} devMode={showDevMode} />

          {/* Payment details from profile */}
          <AbsText config={OVERLAYS.paymentAccountNo} value={profile.accountNumber} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentAccountTitle} value={profile.accountTitle} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentBankName} value={profile.bankName} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentIban} value={profile.iban} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentSwift} value={profile.swift} devMode={showDevMode} />
          <AbsText config={OVERLAYS.paymentMethod} value={profile.paymentMethod} devMode={showDevMode} />

          {/* Footer values */}
          <AbsText config={OVERLAYS.footerName} value={profile.footerName} devMode={showDevMode} />
          <AbsText config={OVERLAYS.footerNTN} value={profile.footerNTN} devMode={showDevMode} />

          {/* Invoice Items */}
          {items.map((item, idx) => {
            // Adjust the base Y position and spacing if necessary
            const yPos = 485 + (idx * 30);
            return (
              <div key={idx}>
                <AbsText config={{ x: 40, y: yPos - 2, w: 50, fontSize: 13, fontWeight: 500, color: '#1f2937', align: 'center' }} value={idx + 1} devMode={showDevMode} />
                <AbsText config={{ x: 160, y: yPos - 2, w: 320, fontSize: 13, fontWeight: 500, color: '#1f2937' }} value={item.description} devMode={showDevMode} />
                <AbsText config={{ x: 430, y: yPos - 2, w: 60, fontSize: 13, fontWeight: 500, color: '#1f2937', align: 'center' }} value={item.qty} devMode={showDevMode} />
                <AbsText config={{ x: 522, y: yPos - 2, w: 80, fontSize: 13, fontWeight: 500, color: '#1f2937', align: 'center' }} value={item.rate} devMode={showDevMode} />
                <AbsText config={{ x: 630, y: yPos - 2, w: 100, fontSize: 13, fontWeight: 500, color: '#1f2937', align: 'center' }} value={item.amount} devMode={showDevMode} />

                {/* Horizontal row separator */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.round(48 * SCALE.x)}px`,
                    top: `${Math.round((yPos + 18) * SCALE.y)}px`,
                    width: `${Math.round(700 * SCALE.x)}px`,
                    borderBottom: '1px solid #9ca3af',
                    zIndex: 2,
                  }}
                />
              </div>
            );
          })}

          {/* Totals */}
          <AbsText config={{ x: 630, y: 707, w: 100, fontSize: 16, fontWeight: 500, color: '#1f2937', align: 'left' }} value={subTotal.toFixed(2)} devMode={showDevMode} />
          <AbsText config={{ x: 630, y: 740, w: 100, fontSize: 16, fontWeight: 500, color: '#1f2937', align: 'left' }} value={discountVal > 0 ? `-${discountVal.toFixed(2)}` : '0.00'} devMode={showDevMode} />
          <AbsText config={{ x: 630, y: 773, w: 100, fontSize: 15, fontWeight: 900, color: '#ffffff', align: 'left' }} value={total.toFixed(2)} devMode={showDevMode} />
          {/* <AbsText config={{ x: 630, y: 712, w: 100, fontSize: 16, fontWeight: 500, color: '#1f2937', align: 'left' }} value={subTotal.toFixed(2)} devMode={showDevMode} />
          <AbsText config={{ x: 630, y: 745, w: 100, fontSize: 16, fontWeight: 500, color: '#1f2937', align: 'left' }} value={discountVal > 0 ? `-${discountVal.toFixed(2)}` : '0.00'} devMode={showDevMode} />
          <AbsText config={{ x: 630, y: 778, w: 100, fontSize: 14, fontWeight: 900, color: '#ffffff', align: 'left' }} value={total.toFixed(2)} devMode={showDevMode} /> */}

          {/* Notes */}
          <AbsText
            config={{
              x: 44,
              y: 692,
              w: 315,
              fontSize: 12,
              fontWeight: 500,
              color: '#1f2937',
              wrap: true,
              lineHeight: 32,
              align: 'left',
              textIndent: 60,
              maxLines: 2
            }}
            value={invoice.notes}
            devMode={showDevMode}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-[420px] border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-[#0a1f44]">Generate Invoice</h2>
            <p className="text-xs text-gray-500">Header + payment details come from Edit Invoice</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="rounded text-[#0a1f44]"
              />
              Dev Mode
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={fitPreview}
                onChange={(e) => setFitPreview(e.target.checked)}
                className="rounded text-[#0a1f44]"
              />
              Fit Preview
            </label>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                isDownloading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#0a1f44] text-white hover:bg-[#081a38]'
              }`}
            >
              {isDownloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="p-6 flex-1">
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Profile (Read Only)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <ReadOnlyRow label="Phone" value={profile.phone} />
              <ReadOnlyRow label="Email" value={profile.email} />
              <ReadOnlyRow label="Website" value={profile.website} />
              <ReadOnlyRow label="Location" value={profile.location} />
              <div className="border-t border-gray-200 my-2" />
              <ReadOnlyRow label="Account Number" value={profile.accountNumber} />
              <ReadOnlyRow label="Account Title" value={profile.accountTitle} />
              <ReadOnlyRow label="Bank Name" value={profile.bankName} />
              <ReadOnlyRow label="IBAN / Account No" value={profile.iban} />
              <ReadOnlyRow label="SWIFT Code" value={profile.swift} />
              <ReadOnlyRow label="Payment Method" value={profile.paymentMethod} />
              <div className="border-t border-gray-200 my-2" />
              <ReadOnlyRow label="Name" value={profile.footerName} />
              <ReadOnlyRow label="NTN" value={profile.footerNTN} />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              To update these, go to Edit Invoice.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Bill To</h3>
            <InputGroup label="Client Name" field="clientName" value={invoice.clientName} onChange={handleChange} />
            <InputGroup label="Company Name" field="companyName" value={invoice.companyName} onChange={handleChange} />
            <InputGroup label="Address" field="address" value={invoice.address} onChange={handleChange} />
            <InputGroup label="Email" field="clientEmail" value={invoice.clientEmail} onChange={handleChange} type="email" />
            <InputGroup label="Phone" field="clientPhone" value={invoice.clientPhone} onChange={handleChange} />
            <InputGroup label="Company Number" field="companyNumber" value={invoice.companyNumber} onChange={handleChange} />
            <InputGroup label="VAT" field="vat" value={invoice.vat} onChange={handleChange} />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Invoice Details</h3>
            <InputGroup label="Invoice Number" field="invoiceNo" value={invoice.invoiceNo} onChange={handleChange} />
            <InputGroup label="Invoice Date" field="invoiceDate" value={invoice.invoiceDate} onChange={handleChange} type="date" />
            <InputGroup label="Due Date" field="dueDate" value={invoice.dueDate} onChange={handleChange} type="date" />
            <InputGroup label="Currency" field="currency" value={invoice.currency} onChange={handleChange} />
            <InputGroup label="Payment Terms" field="paymentTerms" value={invoice.paymentTerms} onChange={handleChange} />

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (Max 110 chars)</label>
              <textarea
                value={invoice.notes ?? ''}
                maxLength={110}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 110) {
                    handleChange('notes', val);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-[#0a1f44] focus:outline-none focus:ring-1 focus:ring-[#0a1f44] min-h-[80px]"
                placeholder="Enter any additional notes..."
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">
                  {invoice.notes?.length || 0} / 110 chars
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-sm font-bold text-gray-800">Invoice Items</h3>
              {items.length < 6 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setIsModalOpen(true);
                  }}
                  className="text-xs bg-[#0a1f44] text-white px-3 py-1 rounded hover:bg-[#081a38]"
                >
                  + Add Row
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-gray-500 italic mb-4">No items added yet. Max 6 rows allowed.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="text-xs overflow-hidden">
                      <p className="font-semibold text-gray-800 truncate">{item.description}</p>
                      <p className="text-gray-500 mt-0.5">
                        {item.qty} x {item.rate} = <span className="font-medium text-gray-700">{item.amount}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.81.936a.75.75 0 01-.955-.955l.936-2.81a4.5 4.5 0 011.14-1.89l13.609-13.61z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {items.length >= 6 && (
              <p className="text-xs text-amber-600 mb-4">Maximum of 6 rows reached.</p>
            )}

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-end items-center gap-4 text-sm mb-2">
                <span className="font-semibold text-gray-600">Sub Total:</span>
                <span className="w-24 text-right font-medium text-gray-800">{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-end items-center gap-4 text-sm mb-2">
                <span className="font-semibold text-gray-600">Discount (%):</span>
                <div className="w-24 relative">
                  <input
                    type="number"
                    value={invoice.discount ?? ''}
                    onChange={(e) => handleChange('discount', e.target.value)}
                    className="w-full pl-2 pr-6 py-1 border border-gray-300 rounded text-right focus:border-[#0a1f44] focus:outline-none focus:ring-1 focus:ring-[#0a1f44]"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
              </div>
              <div className="flex justify-end items-center gap-4 text-base font-bold mt-3">
                <span className="text-[#0a1f44]">Total:</span>
                <span className="w-24 text-right text-[#0a1f44]">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 bg-gray-200 overflow-auto p-8 flex justify-center items-start">
        <div ref={previewWrapRef} className="w-full flex justify-center items-start">
          <div style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
            <PreviewCanvas scale={effectiveScale} showDevMode={devMode} />
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: `${CANVAS.W}px`,
          height: `${CANVAS.H}px`,
          pointerEvents: 'none',
        }}
      >
        <PreviewCanvas scale={1} innerRef={captureRef} showDevMode={false} withShadow={false} />
      </div>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIndex(null);
        }}
        initialItem={editingIndex !== null ? items[editingIndex] : null}
        onAdd={(item) => {
          if (editingIndex !== null) {
            const newItems = [...items];
            newItems[editingIndex] = item;
            setItems(newItems);
          } else {
            setItems([...items, item]);
          }
        }}
      />
    </div>
  );
}
