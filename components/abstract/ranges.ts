export type Span = { start: number; end: number };
export function normalize(spans: Span[], length: number): Span[] {
  const valid = spans.filter(s => s && Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end <= length && s.start < s.end).sort((a,b) => a.start-b.start);
  const result: Span[] = [];
  for (const s of valid) {
    const last = result[result.length-1];
    if (last && s.start <= last.end) last.end = Math.max(last.end,s.end);
    else result.push({...s});
  }
  return result;
}
export function subtract(spans: Span[], selection: Span): Span[] {
  return spans.flatMap(s => {
    if (s.end <= selection.start || s.start >= selection.end) return [s];
    return [s.start < selection.start ? {start:s.start,end:selection.start}:null, s.end > selection.end ? {start:selection.end,end:s.end}:null].filter((s):s is Span => s !== null);
  });
}
