function PaymentHistoryModal({ scheduleId, installment, onClose }) {
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentAPI.getInstallmentPayments(scheduleId, installment.id);
        if (!cancelled) setPayments(data.payments || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message || 'Failed to load payment history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scheduleId, installment.id]);

  const paidAmount = parseFloat(installment.paidAmount ?? 0);
  const instAmount = parseFloat(installment.amount);
  const remaining = Math.max(0, instAmount - paidAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Payment history — {installment.title}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="pay-meta" style={{ marginBottom: 16 }}>
            <span className="pay-meta-label">{inr(instAmount)} total</span>
            <span className="pay-meta-remaining">
              {inr(paidAmount)} paid{remaining > 0 ? ` · ${inr(remaining)} remaining` : ' · fully settled'}
            </span>
          </div>

          {loading && <p className="field-hint">Loading payments…</p>}
          {error && <div className="error-banner">{error}</div>}

          {!loading && !error && (
            payments.length === 0 ? (
              <p className="field-hint">No payments recorded against this installment yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payments.map(p => (
                  <div key={p.id} style={{ border: '1px solid #e7e5e4', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a6b4a' }}>{inr(p.amount)}</span>
                      <span style={{ fontSize: 12, color: '#78716c' }}>{fmtDate(p.paymentDate)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className="inst-task-chip">{(p.paymentMode || '').replace('_', ' ')}</span>
                      {p.referenceNumber && <span className="inst-task-chip">Ref: {p.referenceNumber}</span>}
                      {p.recordedBy?.name && <span className="inst-task-chip">By {p.recordedBy.name}</span>}
                    </div>
                    {p.notes && <p style={{ fontSize: 12, color: '#57534e', marginTop: 6 }}>{p.notes}</p>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}