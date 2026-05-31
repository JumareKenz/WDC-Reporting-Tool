#!/usr/bin/env node
/**
 * Debug script: show what /forms/visible and /forms/:id/versions/:n return
 * Usage: node debug_form_version.mjs <accessToken>
 */

import https from 'https';

const API_BASE = 'https://kadwdc.equily.ng/api/v1';
const token = process.argv[2];

if (!token || token.length < 20) {
  console.error('Usage: node debug_form_version.mjs <accessToken>');
  console.error('Get token from: localStorage.getItem("wdc_auth_token")');
  process.exit(1);
}

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
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
    req.end();
  });
}

async function main() {
  console.log('🔍 Fetching forms/visible...\n');

  const forms = await request('GET', '/forms/visible');
  const formsList = Array.isArray(forms) ? forms : (forms?.data || []);

  if (formsList.length === 0) {
    console.log('❌ No forms returned from /forms/visible');
    return;
  }

  console.log(`Found ${formsList.length} form(s):\n`);
  formsList.forEach((f, i) => {
    console.log(`Form ${i + 1}:`);
    console.log(`  id: ${f.id}`);
    console.log(`  name: ${f.name}`);
    console.log(`  slug: ${f.slug}`);
    console.log(`  currentVersionId: ${f.currentVersionId}`);
    console.log(`  Type of currentVersionId: ${typeof f.currentVersionId}`);
    console.log('');
  });

  const deployed = formsList.find(f => f?.currentVersionId);
  if (!deployed) {
    console.log('❌ No form has currentVersionId set');
    return;
  }

  console.log(`\n🔍 Fetching version details for form ${deployed.id}...\n`);
  const versionResp = await request('GET', `/forms/${deployed.id}/versions/${deployed.currentVersionId}`);
  const version = versionResp?.data || versionResp;

  console.log('Version response:');
  console.log(`  version.id: ${version.id}`);
  console.log(`  Type of version.id: ${typeof version.id}`);
  console.log(`  version.formId: ${version.formId}`);
  console.log(`  version.versionNumber: ${version.versionNumber}`);
  console.log(`  version.schema: ${version.schema ? 'present' : 'missing'}`);
  console.log('');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUUID = uuidRegex.test(String(version.id));

  console.log(`✅ version.id is a valid UUID: ${isValidUUID}`);
  console.log(`\n📝 Use this as formVersionId in POST /reports: ${version.id}`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
