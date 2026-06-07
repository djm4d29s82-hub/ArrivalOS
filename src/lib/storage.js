// Storage-Helper für ArrivalOS-Dokumente.
// Supabase Storage (Bucket "documents", privat) wenn verfügbar,
// sonst Base64-Inline-Storage in localStorage (Demo).
//
// Datei-Pfad-Konvention im Bucket:
//   candidates/<candidate_id>/<timestamp>_<sanitized_filename>
// → ermöglicht RLS-Policies auf Candidate-Ordner-Ebene.

import { base44 } from '@/api/base44Client';

const isSupabase = !!base44.raw;
const BUCKET = 'documents';
const SIGNED_URL_TTL_S = 60 * 10; // 10 min

const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Lädt eine Datei hoch und erstellt eine Document-Entity.
 * @returns {Promise<Document>}
 */
export async function uploadDocument({ file, candidateId, type = 'upload', stepId = null }) {
  if (!file || !candidateId) throw new Error('file und candidateId erforderlich');

  let storagePath = null;

  if (isSupabase) {
    const path = `candidates/${candidateId}/${Date.now()}_${sanitize(file.name)}`;
    const { error } = await base44.raw.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    storagePath = path;
  } else {
    // Demo: Base64 in localStorage. Limit ~5 MB.
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Im Demo-Modus max. 5 MB pro Datei.');
    }
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    storagePath = `data:${dataUrl.slice(0, 32)}…`;
    // optional: full base64 separately stored
    try {
      localStorage.setItem(`doc-blob:${candidateId}:${file.name}`, dataUrl);
    } catch {}
  }

  return base44.entities.Document.create({
    candidate_id: candidateId,
    title: file.name,
    type,
    status: 'pending',
    storage_path: storagePath,
    size: file.size,
    mime_type: file.type,
    uploaded_at: new Date().toISOString(),
    // Only attach step_id when linking to a step — keeps the insert column-clean on a DB
    // that hasn't run the document-step-link migration (plain uploads still work).
    ...(stepId ? { step_id: stepId } : {}),
  });
}

/**
 * Erzeugt eine signed URL (10 min gültig) zum Download eines Dokuments.
 * Im Demo-Modus wird die Base64-DataURL zurückgegeben.
 */
export async function getDocumentUrl(doc) {
  if (!doc?.storage_path) return null;
  if (isSupabase) {
    const { data, error } = await base44.raw.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_S);
    if (error) throw error;
    return data.signedUrl;
  }
  // Demo-Mode: Base64 wieder aus localStorage holen
  try {
    return localStorage.getItem(`doc-blob:${doc.candidate_id}:${doc.title}`);
  } catch {
    return null;
  }
}

/**
 * Lädt einen Spesen-Beleg hoch (Greeter) → gibt den Storage-Pfad zurück (für mission_expenses.receipt_url).
 * Pfad-Konvention: receipts/<mission_id>/<timestamp>_<file> — eigene Storage-Policy (Greeter der Mission
 * + Admin dürfen schreiben/lesen; das Unternehmen sieht den Beleg nie, nur den Rechnungsbetrag).
 * @returns {Promise<string>} storage path
 */
export async function uploadReceipt({ file, missionId }) {
  if (!file || !missionId) throw new Error('file und missionId erforderlich');
  const path = `receipts/${missionId}/${Date.now()}_${sanitize(file.name)}`;
  if (isSupabase) {
    const { error } = await base44.raw.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }
  // Demo: Base64 in localStorage (max ~5 MB).
  if (file.size > 5 * 1024 * 1024) throw new Error('Im Demo-Modus max. 5 MB pro Datei.');
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try { localStorage.setItem(`receipt-blob:${path}`, dataUrl); } catch {}
  return path;
}

/** Signed URL (10 min) für einen Spesen-Beleg; Demo: Base64 aus localStorage. */
export async function getReceiptUrl(path) {
  if (!path) return null;
  if (isSupabase) {
    const { data, error } = await base44.raw.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_S);
    if (error) throw error;
    return data.signedUrl;
  }
  try { return localStorage.getItem(`receipt-blob:${path}`); } catch { return null; }
}

/**
 * Löscht Dokument inkl. Storage-Objekt.
 */
export async function deleteDocument(doc) {
  if (!doc) return;
  if (isSupabase && doc.storage_path) {
    await base44.raw.storage.from(BUCKET).remove([doc.storage_path]);
  } else {
    try { localStorage.removeItem(`doc-blob:${doc.candidate_id}:${doc.title}`); } catch {}
  }
  await base44.entities.Document.delete(doc.id);
}
