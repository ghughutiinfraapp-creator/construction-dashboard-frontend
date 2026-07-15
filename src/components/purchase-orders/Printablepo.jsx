'use client';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────
function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(d, withTime = false) {
  if (!d) return '—';
  try { return format(new Date(d), withTime ? 'dd MMM yyyy, hh:mm a' : 'dd MMM yyyy'); }
  catch { return '—'; }
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── HTML builder ──────────────────────────────────────────────────────
// company is optional letterhead info: { name, address, gstin, phone, email }
export function buildPrintHTML(po, company = {}) {
  const {
    name: companyName = 'Ghughuti Infra',
    address: companyAddress = '',
    gstin: companyGstin = '',
    phone: companyPhone = '',
    email: companyEmail = '',
  } = company;

  const items = po.items || [];

  const itemRows = items.length
    ? items.map((item, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>
            <div class="item-name">${esc(item.itemName || '—')}</div>
            ${(item.itemCategory || item.brand) ? `
              <div class="item-desc">
                ${esc(item.itemCategory || '')}${item.itemCategory && item.brand ? ' · ' : ''}${esc(item.brand || '')}
              </div>` : ''}
          </td>
          <td class="c">${esc(item.quantity ?? '—')} ${esc(item.unit || '')}</td>
          <td class="r">${item.unitPrice ? fmtMoney(item.unitPrice) : '—'}</td>
          <td class="r">${item.totalPrice ? fmtMoney(item.totalPrice) : '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="c empty">No items on this purchase order</td></tr>`;

  const statusLabel = esc((po.status || '').replace(/_/g, ' '));
  const urgencyLabel = esc((po.urgency || '').replace(/_/g, ' '));

  const delivery = po.delivery;
  const deliveryStatusLabel = delivery ? esc((delivery.status || '').replace(/_/g, ' ')) : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Purchase Order ${esc(po.poNumber || '')}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1c1917;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1c1917;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .company-name { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .company-meta { font-size: 10.5px; color: #78716c; margin-top: 4px; max-width: 300px; }
  .doc-title { text-align: right; }
  .doc-title h1 {
    font-size: 20px;
    margin: 0 0 4px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .po-number { font-family: monospace; font-size: 13px; font-weight: 700; }
  .status-row { margin-top: 6px; display: flex; gap: 6px; justify-content: flex-end; }
  .pill {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid #d6d3d1;
    color: #44403c;
  }

  .banner {
    margin-bottom: 16px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #fecaca;
    background: #fef2f2;
  }
  .banner .label { font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.03em; }
  .banner .text { font-size: 11.5px; color: #dc2626; margin-top: 3px; }

  .notes-inline {
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 8px;
    background: #fafaf9;
    font-size: 11.5px;
    color: #57534e;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 24px;
    margin-bottom: 18px;
  }
  .info-block {
    border: 1px solid #e7e5e4;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .info-block h3 {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a8a29e;
    margin: 0 0 6px;
    font-weight: 700;
  }
  .info-line { display: flex; justify-content: space-between; padding: 2px 0; gap: 10px; }
  .info-label { color: #78716c; flex-shrink: 0; }
  .info-value { font-weight: 600; text-align: right; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  table.items th {
    background: #f5f5f4;
    text-align: left;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #78716c;
    padding: 8px 10px;
    border: 1px solid #e7e5e4;
  }
  table.items td {
    padding: 8px 10px;
    border: 1px solid #e7e5e4;
    vertical-align: top;
  }
  table.items td.c { text-align: center; }
  table.items td.r { text-align: right; font-family: monospace; }
  .item-name { font-weight: 600; }
  .item-desc { font-size: 10.5px; color: #78716c; margin-top: 2px; }
  .empty { color: #a8a29e; padding: 20px 10px; }

  .totals { width: 260px; margin-left: auto; margin-top: 8px; }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 10px;
    font-size: 12px;
  }
  .totals .grand {
    border-top: 2px solid #1c1917;
    font-weight: 700;
    font-size: 14px;
    padding-top: 8px;
    margin-top: 4px;
  }

  .section { margin-top: 18px; }
  .section-title {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a8a29e;
    font-weight: 700;
    margin: 0 0 8px;
  }
  .delivery-issue {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }
  .delivery-issue .label { font-size: 10px; font-weight: 700; color: #b91c1c; }
  .delivery-issue .text { font-size: 11px; color: #dc2626; margin-top: 2px; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-top: 36px;
  }
  .sig-box { text-align: center; }
  .sig-line {
    border-top: 1px solid #78716c;
    margin-top: 36px;
    padding-top: 6px;
    font-size: 10.5px;
    color: #78716c;
  }

  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #e7e5e4;
    font-size: 9.5px;
    color: #a8a29e;
    text-align: center;
  }

  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <div class="header">
    <div>
      <div class="company-name">${esc(companyName)}</div>
      ${companyAddress ? `<div class="company-meta">${esc(companyAddress)}</div>` : ''}
      <div class="company-meta">
        ${companyGstin ? `GSTIN: ${esc(companyGstin)}` : ''}
        ${companyPhone ? ` &nbsp;·&nbsp; ${esc(companyPhone)}` : ''}
        ${companyEmail ? ` &nbsp;·&nbsp; ${esc(companyEmail)}` : ''}
      </div>
    </div>
    <div class="doc-title">
      <h1>Purchase Order</h1>
      <div class="po-number">${esc(po.poNumber || '—')}</div>
      <div class="status-row">
        <span class="pill">${statusLabel || '—'}</span>
        ${po.urgency ? `<span class="pill">${urgencyLabel}</span>` : ''}
      </div>
    </div>
  </div>

  ${po.rejectionReason ? `
  <div class="banner">
    <div class="label">Rejection Reason</div>
    <div class="text">${esc(po.rejectionReason)}</div>
  </div>` : ''}

  ${po.notes ? `<div class="notes-inline">${esc(po.notes)}</div>` : ''}

  <div class="info-grid">
    <div class="info-block">
      <h3>Order Details</h3>
      <div class="info-line"><span class="info-label">Project</span><span class="info-value">${esc(po.project?.name || '—')}</span></div>
      <div class="info-line"><span class="info-label">Created By</span><span class="info-value">${esc(po.createdBy?.name || '—')}</span></div>
      <div class="info-line"><span class="info-label">Created</span><span class="info-value">${fmtDate(po.createdAt, true)}</span></div>
      ${po.approvedBy?.name ? `<div class="info-line"><span class="info-label">Approved By</span><span class="info-value">${esc(po.approvedBy.name)}</span></div>` : ''}
      ${po.approvedAt ? `<div class="info-line"><span class="info-label">Approved At</span><span class="info-value">${fmtDate(po.approvedAt)}</span></div>` : ''}
    </div>

    <div class="info-block">
      <h3>Vendor Details</h3>
      <div class="info-line"><span class="info-label">Vendor</span><span class="info-value">${esc(po.vendor?.name || 'Not yet assigned')}</span></div>
      ${po.vendor?.phone ? `<div class="info-line"><span class="info-label">Phone</span><span class="info-value">${esc(po.vendor.phone)}</span></div>` : ''}
      ${po.vendor?.email ? `<div class="info-line"><span class="info-label">Email</span><span class="info-value">${esc(po.vendor.email)}</span></div>` : ''}
      ${po.vendor?.address ? `<div class="info-line"><span class="info-label">Address</span><span class="info-value">${esc(po.vendor.address)}</span></div>` : ''}
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:32px" class="c">#</th>
        <th>Item</th>
        <th style="width:100px" class="c">Qty</th>
        <th style="width:100px" class="r">Unit Price</th>
        <th style="width:110px" class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row grand"><span>Total</span><span>${fmtMoney(po.totalAmount)}</span></div>
  </div>

  ${delivery ? `
  <div class="section">
    <p class="section-title">Delivery — ${deliveryStatusLabel || '—'}</p>
    <div class="info-block">
      <div class="info-line"><span class="info-label">Person</span><span class="info-value">${esc(delivery.deliveryPerson?.name || '—')}</span></div>
      <div class="info-line"><span class="info-label">Pickup From</span><span class="info-value">${esc(delivery.pickupAddress || '—')}</span></div>
      <div class="info-line"><span class="info-label">Deliver To</span><span class="info-value">${esc(delivery.dropAddress || '—')}</span></div>
      ${delivery.deliveredAt ? `<div class="info-line"><span class="info-label">Delivered</span><span class="info-value">${fmtDate(delivery.deliveredAt)}</span></div>` : ''}
      ${delivery.verifiedBy?.name ? `<div class="info-line"><span class="info-label">Verified By</span><span class="info-value">${esc(delivery.verifiedBy.name)}</span></div>` : ''}
    </div>
    ${delivery.issueDescription ? `
    <div class="delivery-issue">
      <div class="label">Issue Raised</div>
      <div class="text">${esc(delivery.issueDescription)}</div>
    </div>` : ''}
  </div>` : ''}

  <div class="signatures">
    <div class="sig-box"><div class="sig-line">Prepared By</div></div>
    <div class="sig-box"><div class="sig-line">Approved By</div></div>
    <div class="sig-box"><div class="sig-line">Vendor Signature</div></div>
  </div>

  <div class="footer">
    Generated on ${fmtDate(new Date())} &nbsp;·&nbsp; ${esc(po.poNumber || '')}
  </div>

</body>
</html>`;
}

// ── Open print window ────────────────────────────────────────────────
export function printPurchaseOrder(po, company) {
  if (!po) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow pop-ups to print this purchase order.');
    return;
  }

  const html = buildPrintHTML(po, company);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

// ── Reusable header button ───────────────────────────────────────────
function PrintIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PrintPOButton({ po, company, className = '' }) {
  if (!po) return null;
  return (
    <button
      onClick={() => printPurchaseOrder(po, company)}
      className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100
                  text-stone-400 hover:text-stone-700 transition-colors ${className}`}
      title="Print or save as PDF">
      <PrintIcon />
    </button>
  );
}