'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Modal from '../../../components/ui/Modal';
import VendorForm from '../../../components/vendors/VendorForm';
import PaymentForm from '../../../components/vendors/PaymentForm';
import { useVendors } from '../../../hooks/useVendors';
import { useProjects } from '../../../hooks/useProjects';
import { useAuth } from '../../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getVendor, update, addPayment } = useVendors();
  const { projects, load: loadProjects } = useProjects();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const canManage = user && ['SUPER_ADMIN', 'FINANCE'].includes(user.role);

  const loadVendor = async () => {
    setLoading(true);
    try {
      const v = await getVendor(params.id);
      setVendor(v);
    } catch (err) {
      toast.error('Failed to load vendor details');
      router.push('/vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) loadVendor();
    loadProjects(1, { status: '', search: '' });
  }, [params.id]);

  const handleUpdateVendor = async (payload) => {
    try {
      await update(vendor.id, payload);
      setEditOpen(false);
      await loadVendor();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update vendor');
    }
  };

  const handleRecordPayment = async (payload) => {
    try {
      await addPayment(vendor.id, payload);

      // Auto-update paid amount
      const currentPaid = Number(vendor.paid || 0);
      const newPaid = currentPaid + payload.amount;
      await update(vendor.id, { paid: newPaid });

      setPaymentOpen(false);
      await loadVendor();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record payment');
    }
  };

  const handlePrintPayments = () => {
    if (!vendor) return;

    const creditVal = Number(vendor.credit || 0);
    const paidVal = Number(vendor.paid || 0);
    const balanceVal = creditVal - paidVal;

    const printWindow = window.open('', '_blank', 'width=900,height=650');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print payment history');
      return;
    }

    const rows = (vendor.payments || [])
      .map(
        (p) => `
        <tr>
          <td>${format(new Date(p.paymentDate), 'MMM d, yyyy')}</td>
          <td>${(p.paymentMode || '').replace('_', ' ')}</td>
          <td style="text-align:right">₹${Number(p.amount).toLocaleString()}</td>
          <td>${p.receiptNumber || '—'}</td>
          <td>${p.recordedBy?.name || '—'}</td>
          <td>${p.notes || '—'}</td>
        </tr>
      `
      )
      .join('');

    const totalPaid = (vendor.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const assignedSite =
      projects.find((p) => p.id === vendor.projectId)?.name || '—';

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment History - ${vendor.name}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 32px;
              color: #292524;
            }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { font-size: 12px; color: #78716c; margin-bottom: 20px; }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              color: #57534e;
              border-bottom: 1px solid #e7e5e4;
              padding-bottom: 6px;
              margin: 20px 0 10px;
            }
            .meta {
              display: flex;
              gap: 24px;
              margin-bottom: 8px;
              font-size: 12px;
              flex-wrap: wrap;
            }
            .meta div span {
              display: block;
              color: #78716c;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 8px;
            }
            th, td {
              padding: 8px 10px;
              border-bottom: 1px solid #e7e5e4;
              text-align: left;
            }
            th {
              background: #f5f5f4;
              font-size: 10px;
              text-transform: uppercase;
              color: #78716c;
              letter-spacing: 0.02em;
            }
            tfoot td {
              font-weight: bold;
              border-top: 2px solid #292524;
              border-bottom: none;
            }
            .footer-note {
              margin-top: 24px;
              font-size: 10px;
              color: #a8a29e;
            }
            @media print {
              @page { margin: 20mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${vendor.name}</h1>
          <div class="sub">
            Payment History Report &middot; Generated ${format(
              new Date(),
              'MMM d, yyyy h:mm a'
            )}
          </div>

          <div class="meta">
            <div><span>Contact Person</span>${vendor.contactName || '—'}</div>
            <div><span>Phone</span>${vendor.phone || '—'}</div>
            <div><span>Assigned Site</span>${assignedSite}</div>
          </div>

          <div class="section-title">Financial Summary</div>
          <div class="meta">
            <div><span>Credit / Advance</span>₹${creditVal.toLocaleString()}</div>
            <div><span>Total Paid</span>₹${paidVal.toLocaleString()}</div>
            <div>
              <span>Current Balance</span>
              ₹${Math.abs(balanceVal).toLocaleString()} ${
      balanceVal > 0 ? 'Credit' : balanceVal < 0 ? 'Adv' : ''
    }
            </div>
          </div>

          <div class="section-title">Payment Records</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>Receipt No.</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                '<tr><td colspan="6" style="text-align:center;color:#a8a29e">No payment records found.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Total</td>
                <td style="text-align:right">₹${totalPaid.toLocaleString()}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-note">Generated from Vendor Management System</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <DashboardLayout title="Vendor Details">
        <div className="p-8 flex justify-center"><div className="spinner"></div></div>
      </DashboardLayout>
    );
  }

  if (!vendor) return null;

  const credit = Number(vendor.credit || 0);
  const paid = Number(vendor.paid || 0);
  const balance = credit - paid;

  return (
    <DashboardLayout
      title={vendor.name}
      subtitle="Vendor Profile & Payment History"
      actions={
        <div className="flex gap-2">
          {canManage && (
            <>
              <button className="btn-secondary text-xs" onClick={() => setEditOpen(true)}>
                Edit Vendor
              </button>
              <button className="btn-primary text-xs" onClick={() => setPaymentOpen(true)}>
                Record Payment
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl animate-fade-in">

        {/* Top Cards: Details & Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">Contact Info</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-stone-400 mb-1">Contact Person</div>
                <div className="font-medium text-stone-800">{vendor.contactName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Phone</div>
                <div className="font-medium text-stone-800">{vendor.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Email</div>
                <div className="font-medium text-stone-800">{vendor.email || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-stone-400 mb-1">Address</div>
                <div className="font-medium text-stone-800 whitespace-pre-wrap">{vendor.address || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-stone-400 mb-1">Assigned Site</div>
                <div className="font-medium text-stone-800">
                  {projects.find(p => p.id === vendor.projectId)?.name || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">Financial Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-stone-50 rounded-lg">
                <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-1">Credit / Advance</div>
                <div className="text-lg font-mono font-medium text-stone-800">₹{credit.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg">
                <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-1">Total Paid</div>
                <div className="text-lg font-mono font-medium text-stone-800">₹{paid.toLocaleString()}</div>
              </div>
              <div className={`p-3 rounded-lg ${balance > 0 ? 'bg-red-50' : balance < 0 ? 'bg-green-50' : 'bg-stone-50'}`}>
                <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-1">Current Balance</div>
                <div className={`text-lg font-mono font-medium ${balance > 0 ? 'text-red-700' : balance < 0 ? 'text-green-700' : 'text-stone-800'}`}>
                  ₹{Math.abs(balance).toLocaleString()} {balance > 0 ? 'Credit' : balance < 0 ? 'Adv' : ''}
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2 pt-2">Banking Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-stone-400 mb-1">Bank Name</div>
                <div className="font-medium text-stone-800">{vendor.bankName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Account No.</div>
                <div className="font-mono text-stone-800">{vendor.accountNumber || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">IFSC Code</div>
                <div className="font-mono text-stone-800 uppercase">{vendor.ifscCode || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">A/c Holder Name</div>
                <div className="font-medium text-stone-800">{vendor.accountHolderName || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-25 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800">Payment History</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-stone-400 font-mono">{vendor.payments?.length || 0} record(s)</span>
              {canManage && (
                <button
                  className="btn-secondary text-md font-bold px-4 py-2"
                  onClick={handlePrintPayments}
                  disabled={!vendor.payments?.length}
                  title={!vendor.payments?.length ? 'No payments to print' : 'Print payment history'}
                >
                  Print
                </button>
              )}
            </div>
          </div>
          {vendor.payments?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-50">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Mode</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Receipt No.</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Recorded By</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {vendor.payments.map(payment => (
                  <tr key={payment.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-25 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-stone-600">{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{payment.paymentMode.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono font-medium text-stone-800">₹{Number(payment.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-stone-500 font-mono">{payment.receiptNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-stone-500">{payment.recordedBy?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-stone-500">{payment.notes || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-stone-500">No payment records found.</div>
          )}
        </div>

        {/* Purchase Orders Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-25 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800">Recent Purchase Orders</h3>
            <span className="text-[10px] text-stone-400 font-mono">{vendor.purchaseOrders?.length || 0} order(s)</span>
          </div>
          {vendor.purchaseOrders?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-50">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">PO Number</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendor.purchaseOrders.map(po => (
                  <tr key={po.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-25 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-stone-800">{po.poNumber}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-stone-600">{format(new Date(po.createdAt), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono font-medium text-stone-800">₹{Number(po.totalAmount || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        po.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        po.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        po.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-stone-100 text-stone-700'
                      }`}>{po.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-stone-500">No purchase orders found.</div>
          )}
        </div>

      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Vendor" width="max-w-2xl">
        <VendorForm initial={vendor} projects={projects} onSubmit={handleUpdateVendor} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment" width="max-w-xl">
        <PaymentForm onSubmit={handleRecordPayment} onCancel={() => setPaymentOpen(false)} />
      </Modal>

    </DashboardLayout>
  );
}