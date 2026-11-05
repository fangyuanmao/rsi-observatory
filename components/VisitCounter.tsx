'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Share one request across component remounts, including React Strict Mode.
let visitRequest: Promise<number> | undefined;
function recordVisit() {
  return visitRequest ??= (async () => {
    let response = await fetch('/api/visits', {
      method: 'POST', headers: { 'X-Visit-Counter': '1' }, cache: 'no-store',
    });
    // Never automatically repeat a write with an uncertain outcome.
    if (!response.ok) response = await fetch('/api/visits', { cache: 'no-store' });
    if (!response.ok) throw Error('Counter unavailable');
    const data = await response.json();
    if (!Number.isSafeInteger(data.total) || data.total < 0) throw Error('Invalid count');
    return data.total as number;
  })();
}
export default function VisitCounter() {
  const [target, setTarget] = useState<Element | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const notes = document.querySelectorAll('aside .side-note');
    const container = notes.item(notes.length - 1);
    if (!container) return;
    setTarget(container);
    let active = true;
    recordVisit().then(value => { if (active) setTotal(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!target) return null;
  return createPortal(
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e5eaf0', fontSize: 12 }}
      title="Homepage views since this counter was enabled. Reloads count as new views; this is not a unique visitor count.">
      Total visits: <strong style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
        {total === null ? '—' : total.toLocaleString('en-GB')}
      </strong>
    </div>, target,
  );
}
