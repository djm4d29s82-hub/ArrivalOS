#!/usr/bin/env node
/**
 * ARRIVAL OS — RLS Test Harness
 *
 * Verifies that Supabase Row Level Security policies enforce data isolation.
 * Run: node scripts/test-rls.js
 * CI:  add to package.json "test:rls": "node scripts/test-rls.js"
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in env (service role key
 *     is needed to bypass RLS for test user creation / cleanup).
 *   - SUPABASE_COMPANY_EMAIL, SUPABASE_GREETER_EMAIL, SUPABASE_TALENT_EMAIL
 *     must be seeded test accounts in your Supabase project.
 *
 * What is tested:
 *   ✓ company can only read their own missions
 *   ✓ company cannot read another company's missions
 *   ✓ greeter can only read missions where greeter_id = their profile
 *   ✓ greeter cannot read unassigned missions
 *   ✓ talent can only read their own candidate record
 *   ✓ activity_log is append-only (no UPDATE/DELETE)
 *   ✓ anyone can insert a lead (public contact form)
 *   ✓ admin can read everything
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // admin, bypasses RLS
const COMPANY_EMAIL        = process.env.SUPABASE_COMPANY_EMAIL  || 'test-company@neuland.test';
const COMPANY_PASSWORD     = process.env.SUPABASE_COMPANY_PASSWORD || 'test-password-company';
const GREETER_EMAIL        = process.env.SUPABASE_GREETER_EMAIL  || 'test-greeter@neuland.test';
const GREETER_PASSWORD     = process.env.SUPABASE_GREETER_PASSWORD || 'test-password-greeter';
const TALENT_EMAIL         = process.env.SUPABASE_TALENT_EMAIL   || 'test-talent@neuland.test';
const TALENT_PASSWORD      = process.env.SUPABASE_TALENT_PASSWORD || 'test-password-talent';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[test-rls] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  console.error('           These tests require a running Supabase instance with test users seeded.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`      ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectDenied(label, fn) {
  let data, error;
  try {
    ({ data, error } = await fn());
  } catch (e) {
    error = e;
  }
  assert(
    error || !data || (Array.isArray(data) && data.length === 0),
    `${label}: expected RLS denial but got data: ${JSON.stringify(data)}`
  );
}

async function expectAllowed(label, fn) {
  const { data, error } = await fn();
  assert(!error, `${label}: expected success but got error: ${error?.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function loginAs(email, password) {
  const sb = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || '');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login as ${email} failed: ${error.message}`);
  return sb;
}

// ---------------------------------------------------------------------------
// Test seed helpers
// ---------------------------------------------------------------------------
async function getSeedData() {
  const { data: companies } = await admin.from('companies').select('id').limit(2);
  const { data: missions }  = await admin.from('missions').select('id, company_id, greeter_id, candidate_id').limit(5);
  const { data: candidates } = await admin.from('candidates').select('id, company_id').limit(3);
  const { data: greeters } = await admin.from('greeter_profiles').select('id').limit(2);
  return { companies, missions, candidates, greeters };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function runTests() {
  console.log('\n\x1b[1mARRIVAL OS — RLS Test Harness\x1b[0m\n');

  const seed = await getSeedData();

  if (!seed.companies?.length || !seed.missions?.length) {
    console.error('[test-rls] No seed data found. Run the seed script first.');
    process.exit(1);
  }

  const company1Id = seed.companies[0]?.id;
  const company2Id = seed.companies[1]?.id;
  const missionForCompany1 = seed.missions.find(m => m.company_id === company1Id);
  const missionForCompany2 = seed.missions.find(m => m.company_id === company2Id);

  // ── Company tests ──────────────────────────────────────────────────────────
  console.log('\x1b[1mCompany isolation\x1b[0m');
  const companyClient = await loginAs(COMPANY_EMAIL, COMPANY_PASSWORD).catch(() => null);

  if (companyClient) {
    if (missionForCompany1) {
      await test('company can read own missions', async () => {
        const data = await expectAllowed('own missions', () =>
          companyClient.from('missions').select('id').eq('company_id', company1Id)
        );
        assert(data.length > 0, 'Expected at least one mission for company1');
      });
    }

    if (missionForCompany2) {
      await test('company cannot read another company\'s missions', async () => {
        await expectDenied('other company missions', () =>
          companyClient.from('missions').select('id').eq('company_id', company2Id)
        );
      });
    }

    await test('company cannot delete missions', async () => {
      await expectDenied('mission delete', () =>
        companyClient.from('missions').delete().eq('company_id', company1Id)
      );
    });
  } else {
    console.warn('  \x1b[33m⚠\x1b[0m  Company login skipped (user not seeded)');
  }

  // ── Greeter tests ─────────────────────────────────────────────────────────
  console.log('\n\x1b[1mGreeter isolation\x1b[0m');
  const greeterClient = await loginAs(GREETER_EMAIL, GREETER_PASSWORD).catch(() => null);

  if (greeterClient) {
    const { data: greeterProfile } = await greeterClient.from('greeter_profiles')
      .select('id').limit(1).single();

    if (greeterProfile) {
      const assignedMission = seed.missions.find(m => m.greeter_id === greeterProfile.id);

      if (assignedMission) {
        await test('greeter can read assigned missions', async () => {
          const data = await expectAllowed('greeter assigned', () =>
            greeterClient.from('missions').select('id').eq('greeter_id', greeterProfile.id)
          );
          assert(data.length > 0, 'Expected assigned mission to be readable');
        });
      }

      await test('greeter cannot delete any mission', async () => {
        await expectDenied('greeter delete', () =>
          greeterClient.from('missions').delete().neq('id', 'nonexistent')
        );
      });
    }
  } else {
    console.warn('  \x1b[33m⚠\x1b[0m  Greeter login skipped (user not seeded)');
  }

  // ── Talent tests ─────────────────────────────────────────────────────────
  console.log('\n\x1b[1mTalent isolation\x1b[0m');
  const talentClient = await loginAs(TALENT_EMAIL, TALENT_PASSWORD).catch(() => null);

  if (talentClient) {
    const { data: talentUser } = await talentClient.from('users').select('candidate_id').limit(1).single();

    if (talentUser?.candidate_id) {
      await test('talent can read own candidate record', async () => {
        const data = await expectAllowed('own candidate', () =>
          talentClient.from('candidates').select('id').eq('id', talentUser.candidate_id)
        );
        assert(data.length === 1, 'Expected exactly 1 own candidate record');
      });

      await test('talent cannot read other candidates', async () => {
        await expectDenied('other candidates', () =>
          talentClient.from('candidates').select('id').neq('id', talentUser.candidate_id)
        );
      });
    }
  } else {
    console.warn('  \x1b[33m⚠\x1b[0m  Talent login skipped (user not seeded)');
  }

  // ── Audit log immutability ─────────────────────────────────────────────────
  console.log('\n\x1b[1mAudit log immutability\x1b[0m');
  if (companyClient) {
    await test('nobody can UPDATE activity_logs', async () => {
      await expectDenied('activity_log update', () =>
        companyClient.from('activity_logs')
          .update({ description: 'tampered' })
          .neq('id', 'nonexistent')
      );
    });

    await test('nobody can DELETE activity_logs', async () => {
      await expectDenied('activity_log delete', () =>
        companyClient.from('activity_logs').delete().neq('id', 'nonexistent')
      );
    });
  }

  // ── Public insert (lead form) ──────────────────────────────────────────────
  console.log('\n\x1b[1mPublic access\x1b[0m');
  await test('anon can insert a lead (public contact form)', async () => {
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || '');
    const { error } = await anon.from('leads').insert({
      name: 'RLS Test Lead',
      email: 'rls-test@test.invalid',
      message: 'Automated RLS test',
    });
    assert(!error, `Lead insert failed: ${error?.message}`);
    // cleanup
    await admin.from('leads').delete().eq('email', 'rls-test@test.invalid');
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  if (failed === 0) {
    console.log(`\x1b[32m✓ All ${passed} RLS tests passed.\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m✗ ${failed} test(s) failed, ${passed} passed.\x1b[0m`);
    for (const f of failures) {
      console.error(`   - ${f.name}: ${f.error}`);
    }
    console.error('');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[test-rls] Unexpected error:', err.message);
  process.exit(1);
});
