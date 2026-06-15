import { COMPANY } from '@/lib/siteConfig';

// Druckbare §14-/§19-UStG-Rechnung — öffnet ein sauberes Dokument und ruft den Browser-Druck auf
// („Als PDF speichern"). Bewusst ohne PDF-Library (kein Bundle-Ballast).
//
// Kleinunternehmer §19: KEINE Umsatzsteuer ausweisen, Pflichthinweis statt USt-Zeilen.
// Der Betrag ist der Endbetrag (base_amount = Paket, expenses_amount = verauslagte Spesen/Tickets).

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const euro = (n) =>
  `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const date = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export function printInvoice({ invoice, company, serviceDate }) {
  const isDraft = invoice?.status === 'draft';
  const number = invoice?.invoice_number || (isDraft ? 'ENTWURF' : `AG-${String(invoice?.id || '').slice(0, 8)}`);

  const base = invoice?.base_amount ?? ((invoice?.amount || 0) - (invoice?.expenses_amount || 0));
  const expenses = invoice?.expenses_amount || 0;
  const total = invoice?.amount ?? base + expenses;

  // Empfänger-Anschrift (so vollständig wie vorhanden — §14 verlangt Name + Anschrift).
  const recipientLines = [
    company?.name,
    company?.street,
    [company?.zip, company?.city].filter(Boolean).join(' '),
    company?.email,
  ].filter(Boolean);

  const taxLine = COMPANY.taxNumber
    ? `Steuernummer: ${esc(COMPANY.taxNumber)}`
    : (COMPANY.vatId ? `USt-IdNr.: ${esc(COMPANY.vatId)}` : '');

  const rows = [
    `<tr><td>Ankunfts-Paket${company?.package_tier ? ` (${esc(company.package_tier)})` : ''}</td><td class="r">${euro(base)}</td></tr>`,
    expenses > 0
      ? `<tr><td>Verauslagte Spesen &amp; Tickets (durchlaufende Posten)</td><td class="r">${euro(expenses)}</td></tr>`
      : '',
  ].join('');

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Rechnung ${esc(number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;
         font-size: 12px; line-height: 1.55; margin: 0; padding: 28mm 22mm; }
  .brand { font-size: 19px; font-weight: 800; letter-spacing: .04em; }
  .brand span { color: #c49228; }
  .muted { color: #6b6b6b; }
  .sender { font-size: 9.5px; color: #6b6b6b; border-bottom: 1px solid #e3e3e3; padding-bottom: 4px; margin: 26px 0 6px; }
  .recipient { margin: 8px 0 26px; }
  .recipient div { font-size: 12.5px; }
  .meta { width: 100%; margin: 0 0 18px; border-collapse: collapse; }
  .meta td { padding: 1px 0; vertical-align: top; }
  .meta .k { color: #6b6b6b; width: 130px; }
  h1 { font-size: 20px; margin: 8px 0 2px; }
  table.items { width: 100%; border-collapse: collapse; margin: 6px 0 0; }
  table.items th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
                   color: #6b6b6b; border-bottom: 1.5px solid #1a1a1a; padding: 6px 0; }
  table.items td { padding: 9px 0; border-bottom: 1px solid #ececec; }
  .r { text-align: right; white-space: nowrap; }
  .total { display: flex; justify-content: flex-end; margin-top: 14px; }
  .total table { border-collapse: collapse; min-width: 240px; }
  .total td { padding: 4px 0; }
  .total .grand td { font-weight: 800; font-size: 14px; border-top: 1.5px solid #1a1a1a; padding-top: 8px; }
  .note { margin: 18px 0; padding: 10px 12px; background: #faf6ec; border: 1px solid #ecdcb0; border-radius: 6px; font-size: 11.5px; }
  .pay { margin: 16px 0; font-size: 11.5px; }
  footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e3e3e3; color: #6b6b6b; font-size: 9.5px;
           display: flex; gap: 28px; }
  footer div { flex: 1; }
  .draft { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 86px; font-weight: 800;
           color: rgba(196,146,40,.12); transform: rotate(-18deg); letter-spacing: .1em; pointer-events: none; }
  @media print { body { padding: 18mm 18mm; } @page { margin: 0; } }
</style></head><body>
${isDraft ? '<div class="draft">ENTWURF</div>' : ''}

<div class="brand">ARRIVAL <span>GERMANY</span></div>

<div class="sender">${esc(COMPANY.legalName)} · ${esc(COMPANY.street)} · ${esc(COMPANY.zip)} ${esc(COMPANY.city)}</div>
<div class="recipient">
  ${recipientLines.map((l) => `<div>${esc(l)}</div>`).join('')}
</div>

<h1>Rechnung</h1>
<table class="meta">
  <tr><td class="k">Rechnungsnummer</td><td>${esc(number)}</td></tr>
  <tr><td class="k">Rechnungsdatum</td><td>${date(invoice?.issued_at)}</td></tr>
  <tr><td class="k">Leistungsdatum</td><td>${date(serviceDate || invoice?.issued_at)}</td></tr>
  ${taxLine ? `<tr><td class="k">${taxLine.split(':')[0]}</td><td>${esc(taxLine.split(': ')[1] || '')}</td></tr>` : ''}
</table>

<table class="items">
  <thead><tr><th>Beschreibung</th><th class="r">Betrag</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="total"><table>
  <tr class="grand"><td>Gesamtbetrag</td><td class="r">${euro(total)}</td></tr>
</table></div>

<div class="note">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</div>

<div class="pay">
  Zahlbar ohne Abzug bis <strong>${date(invoice?.due_at)}</strong>.
  ${COMPANY.iban ? `<br>Bankverbindung: ${esc(COMPANY.bank)} · IBAN ${esc(COMPANY.iban)}` : ''}
  ${invoice?.invoice_number ? `<br>Bitte bei der Überweisung die Rechnungsnummer ${esc(invoice.invoice_number)} angeben.` : ''}
</div>

<footer>
  <div>
    <strong>${esc(COMPANY.legalName)}</strong><br>
    ${esc(COMPANY.street)}<br>${esc(COMPANY.zip)} ${esc(COMPANY.city)}, ${esc(COMPANY.country)}
  </div>
  <div>
    ${COMPANY.ceo ? `Vertreten durch: ${esc(COMPANY.ceo)}<br>` : ''}
    ${COMPANY.hrb ? `${esc(COMPANY.hrb)}, ${esc(COMPANY.registerCourt)}<br>` : ''}
    ${taxLine ? `${taxLine}` : ''}
  </div>
  <div>
    ${esc(COMPANY.email)}<br>${esc(COMPANY.phone)}<br>${esc(COMPANY.brand)}
  </div>
</footer>

<script>window.onload = function(){ window.focus(); window.print(); };</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) {
    alert('Bitte Pop-ups für diese Seite erlauben, um die Rechnung zu drucken.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
