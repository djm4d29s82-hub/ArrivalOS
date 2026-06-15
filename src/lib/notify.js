import { base44 } from '@/api/base44Client';

// Eine In-App-Benachrichtigung erzeugen — best-effort (ein Fehler bricht nie die eigentliche Aktion ab).
//
// Supabase-Modus: über die SECURITY-DEFINER-RPC app_create_notification (Audit S8). Die direkte
// notifications-INSERT-Policy ist admin-only; die RPC erlaubt das Erzeugen nur dem Admin oder einem
// Teilnehmer der referenzierten Mission (deshalb möglichst missionId mitgeben).
// Dev-Modus (localStorage): base44.rpc existiert nicht → direkter Insert (DB ist offen).
export async function notify({ userEmail, title, message, type = 'info', link = '', missionId = null }) {
  if (!userEmail) return;
  try {
    if (typeof base44.rpc === 'function') {
      await base44.rpc('app_create_notification', {
        p_user_email: userEmail,
        p_title: title,
        p_message: message,
        p_type: type,
        p_link: link,
        p_mission_id: missionId,
      });
    } else {
      await base44.entities.Notification.create({ user_email: userEmail, title, message, type, link, read: false });
    }
  } catch { /* notification best-effort */ }
}
