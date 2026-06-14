import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Design coordinate space (A4 at 96dpi)
const DESIGN_CANVAS = { W: 794, H: 1123 };

// Template image size (matches the actual PNG dimensions)
const CANVAS = { W: 1149, H: 1369 };

const SCALE = {
  x: CANVAS.W / DESIGN_CANVAS.W,
  y: CANVAS.H / DESIGN_CANVAS.H,
};

// Absolute pixel positions for text overlays on the design canvas (794x1123)
const OVERLAYS = {
  phone:      { x: 580, y: 40,   w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  email:      { x: 580, y: 75,   w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  website:    { x: 580, y: 108,  w: 180, fontSize: 13, fontWeight: 500, color: '#1f2937' },
  location:   { x: 580, y: 134,  w: 200, fontSize: 13, fontWeight: 500, color: '#1f2937', wrap: true, maxLines: 2, lineHeight: 18 },
  footerName: { x: 185, y: 1060, w: 200, fontSize: 12, fontWeight: 900, color: '#0a1f44', align: 'center', uppercase: true },
  footerNTN:  { x: 405, y: 1055, w: 120,  fontSize: 15, fontWeight: 700, color: '#1f2937', align: 'center' },
};

const InputGroup = ({ label, field, value, onChange }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange?.(field, e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-left focus:border-[#0a1f44] focus:outline-none focus:ring-1 focus:ring-[#0a1f44]"
    />
  </div>
);

// const AbsText = ({ config, value, devMode }) => {
//   if (!value) return null;

//   const scaledX = Math.round(config.x * SCALE.x);
//   const scaledY = Math.round(config.y * SCALE.y);
//   const scaledW = Math.round(config.w * SCALE.x);
//   const scaledFontSize = Math.round(config.fontSize * SCALE.y);

//   // Make the box taller than the font size so the PDF capture doesn’t clip.
//   const textBoxHeight = Math.ceil(scaledFontSize * 1.5);

//   return (
//     <div
//       style={{
//         position: 'absolute',
//         left: `${scaledX}px`,
//         top: `${scaledY}px`,
//         width: `${scaledW}px`,
//         height: `${textBoxHeight}px`,
//         fontSize: `${scaledFontSize}px`,
//         fontWeight: config.fontWeight,
//         color: config.color,
//         textAlign: config.align || 'left',
//         textTransform: config.uppercase ? 'uppercase' : 'none',
//         whiteSpace: 'nowrap',
//         overflow: 'hidden',
//         textOverflow: 'ellipsis',

//         // Keep the line height equal to the font size so the text starts at the top
//         // of the box and doesn’t shift vertically.
//         lineHeight: `${scaledFontSize}px`,
//         fontFamily: 'Arial, Helvetica, sans-serif',
//         boxSizing: 'border-box',
//         border: devMode ? '1px dashed red' : 'none',
//         backgroundColor: devMode ? 'rgba(255,0,0,0.1)' : 'transparent',
//         zIndex: 2,
//       }}
//     >
//       {value}
//     </div>
//   );
// };

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

export default function LetterHeadPage() {
  const [data, setData] = useState({
    phone: '',
    email: '',
    website: '',
    location: '',
    footerName: '',
    footerNTN: '',
  });

  const [devMode, setDevMode] = useState(false);
  const [fitPreview, setFitPreview] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewWrapRef = useRef(null);
  const captureRef = useRef(null);

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('letterhead_data');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse letterhead_data', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('letterhead_data', JSON.stringify(data));
  }, [data]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

    const handleDownloadPdf = async () => {
    if (!captureRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
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
        pdf.save('letterhead.pdf');
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
            backgroundImage: 'url("/templates/letterhead.png")',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <AbsText config={OVERLAYS.phone} value={data.phone} devMode={showDevMode} />
          <AbsText config={OVERLAYS.email} value={data.email} devMode={showDevMode} />
          <AbsText config={OVERLAYS.website} value={data.website} devMode={showDevMode} />
          <AbsText config={OVERLAYS.location} value={data.location} devMode={showDevMode} />
          <AbsText config={OVERLAYS.footerName} value={data.footerName} devMode={showDevMode} />
          <AbsText config={OVERLAYS.footerNTN} value={data.footerNTN} devMode={showDevMode} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-[400px] border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-[#0a1f44]">Letterhead Editor</h2>
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
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Header Information</h3>
            <InputGroup label="Phone" field="phone" value={data.phone} onChange={handleChange} />
            <InputGroup label="Email" field="email" value={data.email} onChange={handleChange} />
            <InputGroup label="Website Address" field="website" value={data.website} onChange={handleChange} />
            <InputGroup label="Location" field="location" value={data.location} onChange={handleChange} />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Footer Information</h3>
            <InputGroup label="Name" field="footerName" value={data.footerName} onChange={handleChange} />
            <InputGroup label="NTN" field="footerNTN" value={data.footerNTN} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Right Panel - Sticky Preview */}
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
    </div>
  );
}
