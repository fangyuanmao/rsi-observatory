export const NOTES_EVENT = 'rsi-notes-changed';
export type Comment = {id:string; body:string; createdAt:string; updatedAt:string};
export const commentKey = (id:string) => `rsi-comments:${id}`;
export function readComments(id:string):Comment[] {
  const data:unknown=JSON.parse(localStorage.getItem(commentKey(id)) || '[]');
  if (!Array.isArray(data)) throw Error('Invalid comments');
  return data.filter((c):c is Comment=>!!c && typeof c.id==='string' && typeof c.body==='string' && typeof c.createdAt==='string' && typeof c.updatedAt==='string');
}
export function notifyNotes(){window.dispatchEvent(new Event(NOTES_EVENT));}
