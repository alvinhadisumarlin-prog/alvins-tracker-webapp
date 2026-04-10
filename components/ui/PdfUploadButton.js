'use client';
import { useState, useRef } from 'react';
import { useData } from '@/hooks/useData';

const SUPABASE_URL = 'https://ipjolefhnzwthmalripz.supabase.co';

export default function PdfUploadButton({ test, compact = false }) {
  const { updateTest } = useData();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const hasPdf = !!test.pdf_url;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('test_id', test.id);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-test-pdf`, {
        method: 'POST',
        headers: {
          'x-admin-key': 'cic-ingest-2026',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Optimistic update - immediately show the new PDF URL
      updateTest(test.id, { pdf_url: data.pdf_url });

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  if (compact) {
    // Compact version for lifecycle row
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <span className="text-[10px] text-slate-400">Uploading...</span>
        ) : hasPdf ? (
          <div className="flex items-center gap-1">
            <a
              href={test.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#4a8b7f] hover:text-[#3d6b5e] font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              📄 View PDF
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="text-[10px] text-slate-400 hover:text-slate-600"
              title="Replace PDF"
            >
              ↻
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="text-[10px] text-amber-600 hover:text-amber-700 font-medium"
          >
            📤 Upload PDF
          </button>
        )}
        {error && <span className="text-[10px] text-red-500 ml-1">{error}</span>}
      </div>
    );
  }

  // Full version for card view
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {uploading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="spinner w-4 h-4"></div>
          <span>Uploading...</span>
        </div>
      ) : hasPdf ? (
        <div className="flex items-center gap-2">
          <a
            href={test.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#4a8b7f] hover:text-[#3d6b5e] font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View PDF
          </a>
          <button
            onClick={handleClick}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload PDF
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
