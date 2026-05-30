-- Migration: add flight_number to missions
-- Date: 2026-05
-- Purpose: store the arrival flight (e.g. "LH456") so the flight-tracker edge
--          function can poll AviationStack and notify the greeter on landing.
--
-- Safe to run multiple times. Run once in the Supabase SQL editor BEFORE deploying
-- a build that writes mission.flight_number (CompanyArrivalForm), otherwise the
-- arrival submit will fail on an unknown column.

alter table public.missions
  add column if not exists flight_number text;
