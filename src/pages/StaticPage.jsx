import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { COMPANY } from '@/lib/siteConfig';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import { usePublicTheme } from '@/lib/usePublicTheme';

function buildPages(c) {
  return {
    impressum: {
      title: 'Impressum',
      meta: `Impressum der ${c.legalName}, gemäß §5 TMG.`,
      body: [
        ['Angaben gemäß § 5 TMG', `${c.legalName}\n${c.street}\n${c.zip} ${c.city}\n${c.country}`],
        ['Vertreten durch', `Geschäftsführung: ${c.ceo}`],
        ['Kontakt', `Telefon: ${c.phone}\nE-Mail: ${c.email}`],
        ['Registereintrag', `Eintragung im Handelsregister.\nRegistergericht: ${c.registerCourt}\nRegisternummer: ${c.hrb}`],
        ['Umsatzsteuer-ID', `${c.vatId}, gemäß §27a Umsatzsteuergesetz`],
        ['Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV', `${c.ceo.split(',')[0]} (Anschrift wie oben)`],
        ['Haftungsausschluss', 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.'],
      ],
    },
    datenschutz: {
      title: 'Datenschutzerklärung',
      meta: `Datenschutzerklärung der ${c.legalName}, DSGVO-konform, EU-Hosting.`,
      body: [
        ['1. Verantwortlicher', `${c.legalName}, ${c.street}, ${c.zip} ${c.city}. Datenschutzbeauftragter: ${c.dpoEmail}`],
        ['2. Erhobene Daten', 'Wir verarbeiten personenbezogene Daten ausschließlich zur Erbringung des Arrival Germany-Services: Stammdaten von Talenten, Unternehmen und Greetern, sowie Operations-Daten der Missions (Status, Kommunikation, Dokumente).'],
        ['3. Rechtsgrundlagen', 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), lit. f (berechtigtes Interesse an Operations-Effizienz), lit. a (Einwilligung, z.B. Marketing).'],
        ['4. Speicherort & Hosting', `Alle Daten werden ausschließlich auf Servern in ${c.hostingCity} verarbeitet (EU). Kein Datentransfer in Drittstaaten.`],
        ['5. Speicherdauer', 'Talent-Daten: max. 24 Monate nach Mission-Abschluss. Greeter-Profile: bis Widerruf. Auftragsdaten: gem. handels- und steuerrechtlicher Aufbewahrungspflichten (6/10 Jahre).'],
        ['6. Ihre Rechte', 'Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch. Beschwerderecht beim Bayerischen Landesamt für Datenschutzaufsicht.'],
        ['7. Cookies & Tracking', 'Wir nutzen ausschließlich technisch notwendige Cookies. Reichweiten-Analyse erfolgt cookieless via Plausible (kein Tracking, kein Profiling, keine personenbezogenen Daten).'],
        ['8. Kontakt zum Datenschutz', `Für alle Anfragen rund um Datenschutz: ${c.dpoEmail}`],
      ],
    },
    agb: {
      title: 'Allgemeine Geschäftsbedingungen',
      meta: `AGB der ${c.legalName} für die Nutzung von Arrival Germany.`,
      body: [
        ['§1 Geltungsbereich', `Diese AGB gelten für alle Verträge zwischen ${c.legalName} und Unternehmen, die Leistungen über die Plattform Arrival Germany in Anspruch nehmen.`],
        ['§2 Leistungsgegenstand', `${c.legalName} stellt mit Arrival Germany eine Plattform zur Steuerung internationaler Onboarding-Prozesse bereit, ergänzt durch lokale Greeter-Dienstleistungen.`],
        ['§3 Preise & Zahlungsbedingungen', 'Preise pro Talent gemäß aktueller Preisliste. Rechnungsstellung erfolgt mit Mission-Start. Zahlungsfrist: 14 Tage netto.'],
        ['§4 Pflichten des Auftraggebers', 'Der Auftraggeber stellt rechtzeitig die für das Onboarding notwendigen Informationen bereit (Visa-Daten, Ankunftsdatum, Wohnungssituation).'],
        ['§5 Haftung', `${c.legalName} haftet für Vorsatz und grobe Fahrlässigkeit. Bei leichter Fahrlässigkeit nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren Schaden.`],
        ['§6 Vertragslaufzeit', 'Verträge laufen pro Talent für die Dauer der vereinbarten Mission, ergänzt um eine Garantiephase von 30 Tagen nach Onboarding-Abschluss.'],
        ['§7 Schlussbestimmungen', `Es gilt deutsches Recht. Gerichtsstand ist ${c.city}.`],
      ],
    },
    karriere: {
      title: 'Karriere bei Arrival Germany',
      meta: 'Offene Stellen bei Arrival Germany, wir bauen die Infrastruktur für menschliches Ankommen in Deutschland.',
      intro: 'Wir bauen die Infrastruktur für menschliches Ankommen in Deutschland. Klingt das nach dir?',
      body: [
        ['Offene Positionen', `– Senior Full-Stack Engineer (Berlin / Remote)
– Operations Lead Süd (München)
– Greeter Community Manager (Hamburg)
– Customer Success Manager DACH (Remote)`],
        ['Was wir bieten', `– Mission mit echtem Impact: Du hilfst Menschen, in Deutschland anzukommen.
– Flexibles Arbeiten, faire Vergütung, ESOP-Beteiligung für Kernteam.
– Diverses, internationales Team, Englisch & Deutsch gemischt.`],
        ['Bewerbung', `Schreib uns ein paar Sätze zu dir an ${c.careersEmail}, kein 12-Seiten-CV nötig.`],
      ],
    },
    presse: {
      title: 'Presse',
      meta: 'Pressekontakt und Materialien von Arrival Germany.',
      intro: 'Materialien, Pressekontakt und letzte Meldungen.',
      body: [
        ['Pressekontakt', `${c.ceo.split(',')[0]}\n${c.pressEmail}\n${c.phone}`],
        ['Über Arrival Germany', `${c.legalName} betreibt Arrival Germany, die Human Arrival Platform für internationales Talent-Onboarding, und arbeitet mit Unternehmen aus Pflege, IT, Engineering und Logistik in deutschen Städten.`],
        ['Pressemeldungen', `– Mai 2026: Arrival Germany erweitert Greeter-Netzwerk
– März 2026: Arrival Germany startet HR-Integrationen mit Personio und DATEV
– Januar 2026: Pilotprojekt mit Klinikum NordWest erfolgreich abgeschlossen`],
        ['Bilder & Logos', `Logo-Pack, Team-Fotos und Produkt-Screenshots auf Anfrage: ${c.pressEmail}`],
      ],
    },
  };
}

export default function StaticPage() {
  usePublicTheme();
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, '').split('/')[0];
  const PAGES = buildPages(COMPANY);
  const page = PAGES[slug];

  useDocumentMeta({
    title: page ? `${page.title}, ${COMPANY.brand}` : `404, ${COMPANY.brand}`,
    description: page?.meta,
  });

  if (!page) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--ds-bg)' }}>
        <Navbar />
        <main id="main-content" className="pt-32 pb-24 max-w-3xl mx-auto px-6 text-center">
          <h1 className="font-serif text-4xl font-bold" style={{ color: 'var(--ds-t1)' }}>Seite nicht gefunden</h1>
          <p className="text-[var(--mid)] mt-4">Diese Seite existiert nicht.</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-8 text-gold hover:opacity-80 transition">
            <ArrowLeft className="w-4 h-4" /> Zurück zur Startseite
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ds-bg)' }}>
      <Navbar />
      <main id="main-content" className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[12px] text-[var(--mid)] hover:text-gold transition mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Zurück
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--ds-t1)' }}>{page.title}</h1>
          {page.intro && <p className="text-[var(--mid)] text-[16px] mt-4 leading-relaxed">{page.intro}</p>}

          <div className="mt-12 space-y-10">
            {page.body.map(([h, t], i) => (
              <section key={i}>
                <h2 className="font-serif text-xl font-bold mb-3" style={{ color: 'var(--ds-t1)' }}>{h}</h2>
                <p className="text-[14px] text-[var(--mid)] leading-relaxed whitespace-pre-line">{t}</p>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-10 text-[12px] text-[var(--light)]" style={{ borderTop: '1px solid var(--ds-card-border)' }}>
            Stand: Mai 2026 · Fragen? <a href={`mailto:${COMPANY.email}`} className="text-gold hover:underline">{COMPANY.email}</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
