'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function NotifyModal({ recipients, defaultMessage, onClose }) {
  // recipients: [{ name, telegram_id, marked }]
  const { token } = useAuth();
  const [allRecipients, setAllRecipients] = useState(() =>
    recipients.map(r => ({
      ...r,
      selected: r.telegram_id ? !r.marked : false,
      selectable: !!r.telegram_id
    }))
  );
  const [message, setMessage] = useState(defaultMessage || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const linked = allRecipients.filter(r => r.selectable);
  const unlinked = allRecipients.filter(r => !r.selectable);
  const selected = allRecipients.filter(r => r.selected);

  function toggleRecipient(index) {
    if (!allRecipients[index]?.selectable) return;
    setAllRecipients(prev => prev.map((r, i) =>
      i === index ? { ...r, selected: !r.selected } : r
    ));
  }

  function toggleAll(selectAll) {
    setAllRecipients(prev => prev.map(r =>
      r.selectable ? { ...r, selected: selectAll } : r
    ));
  }

  async function send() {
    if (!message || selected.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ recipients: selected, message })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, sent: data.sent, failed: data.failed || 0 });
        setTimeout(onClose, 2000);
      } else {
        setResult({ success: false, error: data.error || 'Unknown error' });
      }
    } catch (e) {
      setResult({ success: false, error: 'Network error: ' + e.message });
    }
    setSending(false);
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl p-6 shadow-xl overflow-y-auto" style={{ width: 'min(500px, 92vw)', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-slate-900">Send Notification</h3>
          <button onClick={onClose} className="border-none bg-transparent text-lg text-slate-400 cursor-pointer">✕</button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 items-center mb-3 flex-wrap">
          <span className="text-xs font-semibold text-green-600">✓ {selected.length} selected</span>
          <span className="text-xs text-slate-400">{linked.length} linked</span>
          {unlinked.length > 0 && (
            <span className="text-xs text-red-600">✗ {unlinked.length} no Telegram</span>
          )}
          <button onClick={() => toggleAll(true)} className="border-none bg-transparent text-blue-500 text-[11px] font-semibold cursor-pointer p-0" style={{ fontFamily: 'inherit' }}>Select all</button>
          <button onClick={() => toggleAll(false)} className="border-none bg-transparent text-slate-400 text-[11px] font-medium cursor-pointer p-0" style={{ fontFamily: 'inherit' }}>Clear</button>
        </div>

        {/* Message */}
        <div className="mb-3">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full rounded-lg text-sm outline-none resize-y"
            style={{ padding: 10, border: '1px solid #e2e8f0', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Recipient chips */}
        <div className="flex flex-wrap gap-1 mb-4 max-h-40 overflow-y-auto">
          {linked.map((r, i) => {
            const globalIdx = allRecipients.indexOf(r);
            return (
              <button
                key={i}
                onClick={() => toggleRecipient(globalIdx)}
                className="text-[11px] px-2.5 py-1 rounded-md cursor-pointer transition"
                style={{
                  fontFamily: 'inherit',
                  border: '1px solid',
                  ...(r.selected
                    ? { background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 500 }
                    : { background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0', textDecoration: 'line-through' })
                }}
              >
                {r.name}{r.marked ? ' ✓' : ''}
              </button>
            );
          })}
          {unlinked.map((r, i) => (
            <span
              key={`u-${i}`}
              className="text-[11px] px-2.5 py-1 rounded-md cursor-not-allowed"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', textDecoration: 'line-through' }}
              title="No Telegram linked"
            >
              {r.name}
            </span>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={
            result.success
              ? (result.failed > 0 ? { background: '#fef3c7', color: '#92400e' } : { background: '#f0fdf4', color: '#166534' })
              : { background: '#fef2f2', color: '#dc2626' }
          }>
            {result.success
              ? `✓ Sent to ${result.sent} student${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} failed` : ''}`
              : `Error: ${result.error}`}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontFamily: 'inherit' }}
          >Cancel</button>
          <button
            onClick={send}
            disabled={selected.length === 0 || sending}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer border-none"
            style={{
              background: '#0f172a',
              fontFamily: 'inherit',
              opacity: selected.length === 0 || sending ? 0.4 : 1,
              cursor: selected.length === 0 || sending ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? 'Sending...' : `Send to ${selected.length} student${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
