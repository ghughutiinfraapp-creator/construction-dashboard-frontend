import { useState } from 'react';
import clsx from 'clsx';

export default function VendorForm({ initial, projects = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    contactName: initial?.contactName || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    bankName: initial?.bankName || '',
    accountNumber: initial?.accountNumber || '',
    ifscCode: initial?.ifscCode || '',
    accountHolderName: initial?.accountHolderName || '',
    credit: initial?.credit || '',
    paid: initial?.paid || '',
    projectId: initial?.projectId || '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.credit === '') delete payload.credit;
      if (payload.paid === '') delete payload.paid;
      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">Basic Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Company / Vendor Name *</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Contact Person</label>
            <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input w-full" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} className="input w-full" rows="2" />
          </div>
         
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">Banking Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Account Holder Name</label>
            <input type="text" name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Bank Name</label>
            <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Account Number</label>
            <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">IFSC Code</label>
            <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="input w-full uppercase" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">Financials</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Credit / Advance Value</label>
            <input type="number" step="0.01" name="credit" value={formData.credit} onChange={handleChange} className="input w-full" placeholder="0.00" />
            <p className="text-[10px] text-stone-400 mt-1">Value of materials taken in advance</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Amount Paid</label>
            <input type="number" step="0.01" name="paid" value={formData.paid} onChange={handleChange} className="input w-full" placeholder="0.00" />
            <p className="text-[10px] text-stone-400 mt-1">Amount paid against credit so far</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : (initial ? 'Update Vendor' : 'Add Vendor')}
        </button>
      </div>
    </form>
  );
}
