-- Migration: add scheduled_at to journey_steps
-- Date: 2026-05
-- Purpose: lets Admin plan a target date per onboarding step (MissionStepPlanner)
--          and lets Talent/Greeter see relative due dates ("in 3 Tagen", "überfällig").
--
-- Safe to run multiple times. Run once in the Supabase SQL editor BEFORE deploying
-- the MissionStepPlanner / scheduled_at writes to production.

alter table public.journey_steps
  add column if not exists scheduled_at timestamptz;
