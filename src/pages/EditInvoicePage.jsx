import { useEffect, useState } from 'react';

const STORAGE_KEY = 'invoice_profile';

const DEFAULT_DATA = {
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

export default function EditInvoicePage() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse invoice_profile', error);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isHydrated]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-[420px] border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-[#0a1f44]">Invoice Profile</h2>
            <p className="text-xs text-gray-500">Auto-saved for invoice prefill</p>
          </div>
        </div>

        <div className="p-6 flex-1">
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Header Information</h3>
            <InputGroup label="Phone" field="phone" value={data.phone} onChange={handleChange} />
            <InputGroup label="Email" field="email" value={data.email} onChange={handleChange} type="email" />
            <InputGroup
              label="Website Address"
              field="website"
              value={data.website}
              onChange={handleChange}
              type="url"
              placeholder="https://yourdomain.com"
            />
            <InputGroup label="Location" field="location" value={data.location} onChange={handleChange} />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Payment Details</h3>
            <InputGroup label="Account Title" field="accountTitle" value={data.accountTitle} onChange={handleChange} />
            <InputGroup label="Bank Name" field="bankName" value={data.bankName} onChange={handleChange} />
            <InputGroup label="IBAN / Account No" field="iban" value={data.iban} onChange={handleChange} />
            <InputGroup label="SWIFT Code" field="swift" value={data.swift} onChange={handleChange} />
            <InputGroup label="Payment Method" field="paymentMethod" value={data.paymentMethod} onChange={handleChange} />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Footer Information</h3>
            <InputGroup label="Name" field="footerName" value={data.footerName} onChange={handleChange} />
            <InputGroup label="NTN" field="footerNTN" value={data.footerNTN} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Right Panel - JSON Preview */}
      <div className="flex-1 bg-gray-200 overflow-auto p-8 flex justify-center items-start">
        <div className="bg-white shadow-xl rounded-lg p-6 w-[520px]">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Saved JSON</h3>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-4 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
          <p className="text-xs text-gray-500 mt-3">
            This data is stored in localStorage and will be used to prefill the invoice form.
          </p>
        </div>
      </div>
    </div>
  );
}
