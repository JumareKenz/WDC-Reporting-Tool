#!/usr/bin/env node
/**
 * Integration test: verify report submission works end-to-end
 *
 * Tests the full flow:
 * 1. Load form config (may return null if no deployed form)
 * 2. Create a draft report (with or without formVersionId)
 * 3. Append fields
 * 4. Submit the report
 *
 * Run with: node test_submission.mjs <accessToken>
 */

import https from 'https';

const API_BASE = 'https://kadwdc.equily.ng/api/v1';
const token = process.argv[2];

if (!token || token.length < 20) {
  console.error('Usage: node test_submission.mjs <accessToken>');
  console.error('Get your token from localStorage.getItem("wdc_auth_token") in the browser');
  process.exit(1);
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, body: json });
          } else {
            resolve(json);
          }
        } catch (e) {
          reject({ status: res.statusCode, body: data, parseError: e.message });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing report submission flow...\n');

  // Step 1: Try to get deployed form version (the form_versions.id UUID)
  console.log('1️⃣  Fetching deployed form version...');
  let formVersionId = null;
  try {
    const forms = await request('GET', '/forms/visible');
    const formsList = Array.isArray(forms) ? forms : (forms?.data || []);
    const deployed = formsList.find(f => f?.currentVersionId);

    if (deployed) {
      console.log(`   Found form: ${deployed.name || deployed.id}`);
      console.log(`   form.currentVersionId: ${deployed.currentVersionId}`);

      // Fetch the actual version record to get version.id (the UUID)
      const versionResp = await request('GET', `/forms/${deployed.id}/versions/${deployed.currentVersionId}`);
      const version = versionResp?.data || versionResp;
      formVersionId = version?.id;

      console.log(`   version.id: ${formVersionId}`);
      console.log(`   ✓ Using formVersionId: ${formVersionId}\n`);
    } else {
      console.log(`   ⚠ No deployed form found\n`);
    }
  } catch (err) {
    console.log(`   ⚠ Could not fetch form version: ${err.status} ${JSON.stringify(err.body)}`);
    console.log('   → Proceeding without formVersionId\n');
  }

  // Step 2: Create draft report
  console.log('2️⃣  Creating draft report...');
  const createBody = { submissionMethod: 'wizard' };
  if (formVersionId) createBody.formVersionId = formVersionId;
  console.log(`   Body: ${JSON.stringify(createBody)}`);

  let reportId;
  try {
    const draft = await request('POST', '/reports', createBody);
    reportId = draft?.id || draft?.report?.id;
    if (!reportId) throw new Error('No report ID in response');
    console.log(`   ✓ Created draft: ${reportId}\n`);
  } catch (err) {
    console.error(`   ✗ Failed to create draft: ${err.status}`);
    console.error(`     ${JSON.stringify(err.body, null, 2)}`);
    process.exit(1);
  }

  // Step 3: Append test fields
  console.log('3️⃣  Appending fields...');
  const testFields = {
    report_month: '2026-06',
    meeting_type: 'Regular Monthly',
    meeting_date: '2026-06-15',
    meetings_held: 1,
  };

  for (const [key, value] of Object.entries(testFields)) {
    try {
      await request('POST', `/reports/${reportId}/fields`, { key, value, source: 'typed' });
      console.log(`   ✓ ${key}: ${value}`);
    } catch (err) {
      console.error(`   ✗ Failed to set ${key}: ${err.status} ${JSON.stringify(err.body)}`);
      process.exit(1);
    }
  }
  console.log('');

  // Step 4: Submit the report
  console.log('4️⃣  Submitting report...');
  try {
    await request('POST', `/reports/${reportId}/submit`, {});
    console.log(`   ✓ Report submitted successfully!\n`);
  } catch (err) {
    console.error(`   ✗ Submit failed: ${err.status}`);
    console.error(`     ${JSON.stringify(err.body, null, 2)}`);
    process.exit(1);
  }

  console.log('✅ All tests passed!');
  console.log(`   Report ID: ${reportId}`);
  console.log(`   View at: https://kadwdc.equily.ng/reports/${reportId}`);
}

main().catch(err => {
  console.error('\n❌ Test failed:', err.message || err);
  process.exit(1);
});
