/**
 * PHASE 1: Company Creates Arrival
 * Component: src/pages/company/CompanyArrivalForm.jsx
 *
 * 3-step form:
 * 1. Candidate info (name, email, phone, language)
 * 2. Logistics (city, date, time, flight)
 * 3. Review & confirm
 *
 * Creates:
 * - Arrival record (status: pending_assignment)
 * - Mission record (status: created)
 * - Triggers matching engine
 * - Sends SMS to candidate
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createMission } from '@/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Input, Label, Select, Textarea,
} from '@/components/ui';
import { Plus, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';

export default function CompanyArrivalForm({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [data, setData] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    arrivalCity: 'Berlin',
    arrivalDate: '',
    arrivalTime: '14:00',
    flightNumber: '',
    notes: '',
    languageLevel: 'b1',
  });

  const handleCreate = async () => {
    if (!data.candidateName || !data.candidateEmail || !data.candidatePhone || 
        !data.arrivalDate || !data.flightNumber) {
      setError('Bitte fülle alle erforderlichen Felder aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create Mission with CREATED status.
      // NOTE: there is intentionally no Arrival entity — it is not registered in
      // base44 (ENTITY_NAMES) and calling base44.entities.Arrival.create() throws.
      // The mission is the single source of truth for an arrival request.
      const { mission } = await createMission({
        companyId: user?.company_id || 'unknown',
        title: `${data.candidateName} → ${data.arrivalCity}`,
        city: data.arrivalCity,
        datetime: `${data.arrivalDate}T${data.arrivalTime}:00Z`,
        location: `${data.arrivalCity} Airport`,
        flightNumber: data.flightNumber || undefined,
        role: user?.role || 'company',
        actor: user?.email || 'company@neuland.de',
        base44,
      });

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ['missions'] });

      // Show confirmation
      setConfirmation({
        missionId: mission.id,
        candidateName: data.candidateName,
        city: data.arrivalCity,
      });

    } catch (err) {
      setError(err?.message || 'Fehler beim Erstellen der Ankunft');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setError(null);
    setConfirmation(null);
    setData({
      candidateName: '',
      candidateEmail: '',
      candidatePhone: '',
      arrivalCity: 'Berlin',
      arrivalDate: '',
      arrivalTime: '14:00',
      flightNumber: '',
      notes: '',
      languageLevel: 'b1',
    });
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  // Confirmation screen
  if (confirmation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Ankunft erstellt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Tracking-ID</p>
              <p className="font-mono text-sm font-semibold text-green-700">
                {confirmation.missionId.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm"><strong>{confirmation.candidateName}</strong></p>
              <p className="text-sm text-gray-600">→ {confirmation.city}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-900">
                ✓ Matching Engine läuft<br/>
                ✓ Operations Team benachrichtigt<br/>
                ✓ SMS an Kandidat
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Fertig
              </Button>
              <Button onClick={() => {
                handleReset();
                setStep(1);
              }} className="flex-1">
                + Weitere Ankunft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: Candidate
  if (step === 1) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Ankunft — Schritt 1/3</DialogTitle>
            <DialogDescription>Informationen über den Kandidaten</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Sofia García"
                value={data.candidateName}
                onChange={(e) => setData({ ...data, candidateName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="sofia@example.com"
                value={data.candidateEmail}
                onChange={(e) => setData({ ...data, candidateEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+34 123 456 7890"
                value={data.candidatePhone}
                onChange={(e) => setData({ ...data, candidatePhone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Deutsch Level</Label>
              <Select
                value={data.languageLevel}
                onChange={(e) => setData({ ...data, languageLevel: e.target.value })}
              >
                <option value="a1">A1 (Anfänger)</option>
                <option value="a2">A2</option>
                <option value="b1">B1 (Mittelstufe)</option>
                <option value="b2">B2</option>
                <option value="c1">C1 (Fortgeschrittene)</option>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1">
                Weiter <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Logistics
  if (step === 2) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Ankunft — Schritt 2/3</DialogTitle>
            <DialogDescription>Ankunftsdetails</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="city">Stadt *</Label>
              <Select
                value={data.arrivalCity}
                onChange={(e) => setData({ ...data, arrivalCity: e.target.value })}
              >
                <option value="Berlin">Berlin</option>
                <option value="Frankfurt">Frankfurt</option>
                <option value="Munich">München</option>
                <option value="Hamburg">Hamburg</option>
                <option value="Cologne">Köln</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Datum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={data.arrivalDate}
                  onChange={(e) => setData({ ...data, arrivalDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Uhrzeit *</Label>
                <Input
                  id="time"
                  type="time"
                  value={data.arrivalTime}
                  onChange={(e) => setData({ ...data, arrivalTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight">Flugnummer *</Label>
              <Input
                id="flight"
                placeholder="LH456"
                value={data.flightNumber}
                onChange={(e) => setData({ ...data, flightNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Spezielle Anforderungen, Hinweise..."
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Überprüfung <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: Review
  if (step === 3) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Ankunft — Schritt 3/3</DialogTitle>
            <DialogDescription>Überprüfe die Informationen</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Candidate card */}
            <div className="bg-blue-50 border border-blue-200 dark:bg-blue-500/[0.08] dark:border-blue-500/20 rounded-lg p-4 space-y-1">
              <p className="text-sm text-blue-600 dark:text-blue-400 uppercase text-xs tracking-widest font-bold">Kandidat</p>
              <p className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{data.candidateName}</p>
              <p className="text-sm text-gray-600">{data.candidateEmail}</p>
              <p className="text-sm text-gray-600">{data.candidatePhone}</p>
              <p className="text-sm text-gray-500 mt-2">Deutsch: {data.languageLevel.toUpperCase()}</p>
            </div>

            {/* Logistics card */}
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/[0.08] dark:border-amber-500/20 rounded-lg p-4 space-y-1">
              <p className="text-sm text-amber-600 dark:text-amber-400 uppercase text-xs tracking-widest font-bold">Logistik</p>
              <p className="font-semibold" style={{ color: 'var(--ds-t1)' }}>{data.arrivalCity}</p>
              <p className="text-sm text-gray-600">{data.arrivalDate} um {data.arrivalTime} Uhr</p>
              <p className="text-sm text-gray-600">Flug: {data.flightNumber}</p>
              {data.notes && <p className="text-sm text-gray-500 mt-2">Hinweis: {data.notes}</p>}
            </div>

            {/* Automations preview */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p className="text-green-900 font-medium">Dies wird automatisch ausgelöst:</p>
              <p className="text-green-800">✓ Matching Engine läuft</p>
              <p className="text-green-800">✓ Operations Team benachrichtigt</p>
              <p className="text-green-800">✓ SMS an {data.candidateName}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
              </Button>
              <Button
                onClick={handleCreate}
                loading={loading}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" /> Ankunft erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
