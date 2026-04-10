'use client';

export default function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        className="bg-white rounded-2xl p-6 shadow-xl mx-4"
        style={{ width: 'min(500px, 92vw)', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
