import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStatus, daysLeft, localDay, sortOpportunities, safeLink, type Opportunity } from '../../web/src/lib/radar.js';

test('RADAR calendar boundaries, urgent windows and rolling sorting are stable', () => {
    const base: Opportunity = { id: 'a', category: 'scholarships', organisation: 'Test', title: 'A', kind: 'Undergraduate', opens: '2026-10-01', closes: '2026-10-26', visa: 'unknown', notes: '', link: 'https://example.test/apply', last_verified: '2026-10-01' };
    assert.equal(openStatus(base, '2026-10-26'), 'open');
    assert.equal(openStatus(base, '2026-10-27'), 'closed');
    assert.equal(openStatus({ ...base, opens: '2026-11-01', closes: null }, '2026-10-26'), 'soon');
    assert.equal(openStatus({ ...base, closes: null }, '2026-10-26'), 'open');
    assert.equal(daysLeft('2026-11-02', '2026-10-26'), 7);
    assert.equal(daysLeft('2026-03-09', '2026-03-07'), 2);
    assert.equal(localDay(new Date(2026, 9, 26, 23, 59)), '2026-10-26');
    assert.ok(sortOpportunities(base, { ...base, closes: null }, '2026-10-26') < 0);
    assert.ok(sortOpportunities({ ...base, closes: null }, { ...base, closes: '2026-10-25' }, '2026-10-26') < 0);
    assert.equal(safeLink('javascript:alert(1)'), false);
    assert.equal(safeLink('https://name:secret@example.test'), false);
    assert.equal(safeLink(base.link), true);
});
