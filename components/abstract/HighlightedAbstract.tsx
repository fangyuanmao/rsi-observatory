'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { notifyNotes } from '@/components/notes/storage';
import { normalize, subtract, type Span } from './ranges';

export default function HighlightedAbstract({paperId, text}:{paperId:string;text:string}) {
  const root = useRef<HTMLParagraphElement>(null);
  const [spans,setSpans] = useState<Span[]>([]);
  const [selection,setSelection] = useState<Span|null>(null);
  const [ready,setReady] = useState(false);
  const [message,setMessage] = useState('');
  const storageKey = `rsi-highlights:${paperId}`;
  useEffect(() => {
    setReady(false); setSpans([]); setSelection(null); setMessage('');
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.text === text && Array.isArray(saved.spans)) setSpans(normalize(saved.spans,text.length));
        else if (saved.text !== text) setMessage('The abstract has changed. Earlier highlights were not applied to the new text.');
      }
    } catch { setMessage('Saved highlights could not be loaded.'); }
    setReady(true);
  },[storageKey,text]);
  useEffect(() => {
    function capture() {
      const s = window.getSelection(), el = root.current;
      if (!s || !el || s.isCollapsed || !s.rangeCount) { setSelection(null); return; }
      const range = s.getRangeAt(0);
      if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) { setSelection(null); return; }
      const prefix = document.createRange(); prefix.selectNodeContents(el); prefix.setEnd(range.startContainer,range.startOffset);
      const start = prefix.toString().length, end = start + range.toString().length;
      setSelection(text.slice(start,end).trim() ? {start,end} : null);
    }
    document.addEventListener('selectionchange',capture);
    return () => document.removeEventListener('selectionchange',capture);
  },[text]);
  function save(next:Span[]) {
    setSpans(next); setMessage('Highlights saved in this browser.');
    try { localStorage.setItem(storageKey,JSON.stringify({text,spans:next})); notifyNotes(); }
    catch { setMessage('Browser storage is unavailable. These highlights will last only while this page is open.'); }
    window.getSelection()?.removeAllRanges(); setSelection(null);
  }
  const parts:ReactNode[] = []; let cursor=0;
  for (const s of spans) {
    parts.push(text.slice(cursor,s.start));
    parts.push(<mark className="abstract-highlight" data-highlight-start={s.start} key={s.start}>{text.slice(s.start,s.end)}</mark>);
    cursor=s.end;
  }
  parts.push(text.slice(cursor));
  const overlaps = selection && spans.some(s => s.start < selection.end && s.end > selection.start);
  return <div className="abstract-reader">
    <div className="highlight-toolbar" role="group" aria-label="Abstract highlight tools">
      <button type="button" disabled={!ready || !selection} onPointerDown={e=>e.preventDefault()} onClick={()=>selection && save(normalize([...spans,selection],text.length))}>Highlight</button>
      <button type="button" disabled={!ready || !overlaps} onPointerDown={e=>e.preventDefault()} onClick={()=>selection && save(subtract(spans,selection))}>Remove selected highlight</button>
      <button type="button" disabled={!ready || !spans.length} onClick={()=>save([])}>Clear highlights</button>
    </div>
    <p className="highlight-hint">Select abstract text, then choose Highlight. Saved in this browser only.</p>
    <p className="abstract" ref={root} tabIndex={0} aria-label="Paper abstract">{parts}</p>
    <p className="highlight-status" role="status">{message}</p>
  </div>;
}
