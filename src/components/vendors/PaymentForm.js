import { useState } from 'react';

export default function PaymentForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'BANK_TRANSFER',
    receiptNumber: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ ...formData, amount: parseFloat(formData.amount) });
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Amount *</label>
            <input required type="number" step="0.01" min="0.01" name="amount" value={formData.amount} onChange={handleChange} className="input w-full" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Payment Date</label>
            <input required type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Payment Mode</label>
            <select required name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="input select w-full">
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Receipt / Reference No.</label>
            <input type="text" name="receiptNumber" value={formData.receiptNumber} onChange={handleChange} className="input w-full" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="input w-full" rows="2" placeholder="Any additional details..." />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}
