import fs from 'fs';
import path from 'path';

interface Feature {
  id: string;
  view: string;
  feature: string;
  status: 'implemented' | 'planned' | 'not-applicable';
  screen?: string;
  reason?: string;
}

const root = path.join(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'parity.json'), 'utf8')) as { views: string[]; features: Feature[] };
const template = path.join(process.env.MUX_REPO ?? path.resolve(root, '..', '..', '..', 'Mux'), 'src', 'Mux.Server', 'DashboardTemplate.cs');

describe('parity with the mux local dashboard', () => {
  it('has unique feature ids and only known statuses', () => {
    const ids = manifest.features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of manifest.features) expect(['implemented', 'planned', 'not-applicable']).toContain(f.status);
  });

  it('has nothing planned: every feature is implemented or justified (parity rule)', () => {
    expect(manifest.features.filter((f) => f.status === 'planned').map((f) => f.id)).toEqual([]);
  });

  it('points every implemented feature at a screen that exists', () => {
    const broken = manifest.features.filter((f) => f.status === 'implemented' && (!f.screen || !fs.existsSync(path.join(root, 'src', f.screen))));
    expect(broken.map((f) => f.id + ' -> ' + f.screen)).toEqual([]);
  });

  it('gives every not-applicable feature a reason', () => {
    expect(manifest.features.filter((f) => f.status === 'not-applicable' && !(f.reason && f.reason.length > 20)).map((f) => f.id)).toEqual([]);
  });

  (fs.existsSync(template) ? it : it.skip)('covers every view of the live mux dashboard (needs the mux repository beside MuxCloud, or MUX_REPO)', () => {
    const views = [...new Set([...fs.readFileSync(template, 'utf8').matchAll(/data-view="([a-z0-9-]+)"/g)].map((m) => m[1]))];
    const covered = new Set(manifest.features.map((f) => f.view));
    expect(views.filter((v) => !covered.has(v))).toEqual([]);
  });
});
