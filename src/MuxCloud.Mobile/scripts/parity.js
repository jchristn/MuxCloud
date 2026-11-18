#!/usr/bin/env node
// Keeps parity.json in step with the mux local dashboard. Reads the dashboard's views (data-view="...") from
// DashboardTemplate.cs and, with --write, adds a planned entry for any view parity.json does not cover yet.
// The mux repository is found at $MUX_REPO or ../../../Mux (next to MuxCloud). Without it the script only reports.
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'parity.json');
const muxRepo = process.env.MUX_REPO || path.resolve(__dirname, '..', '..', '..', '..', 'Mux');
const templatePath = path.join(muxRepo, 'src', 'Mux.Server', 'DashboardTemplate.cs');

function dashboardViews() {
  if (!fs.existsSync(templatePath)) return null;
  const text = fs.readFileSync(templatePath, 'utf8');
  return [...new Set([...text.matchAll(/data-view="([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const views = dashboardViews();
if (!views) {
  console.log('Mux repository not found at ' + muxRepo + '; set MUX_REPO to check against the live dashboard.');
  process.exit(0);
}
const covered = new Set(manifest.features.map((f) => f.view));
const missing = views.filter((v) => !covered.has(v));
if (missing.length === 0) {
  console.log('parity.json covers all ' + views.length + ' dashboard views.');
  process.exit(0);
}
if (!process.argv.includes('--write')) {
  console.error('Dashboard views missing from parity.json: ' + missing.join(', '));
  process.exit(1);
}
for (const view of missing) {
  manifest.features.push({ id: view + '.view', view, feature: 'Dashboard view "' + view + '"', status: 'planned' });
}
manifest.views = [...new Set([...manifest.views, ...missing])].sort();
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Added planned entries for: ' + missing.join(', '));
