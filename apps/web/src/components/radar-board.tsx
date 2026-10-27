'use client';
import { SelectField } from '@/components/ui/select-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { categories, myStatuses, localDay, openStatus, daysLeft, sortOpportunities, safeLink, isOpportunity, type Category, type MyStatus, type Opportunity } from '@/lib/radar';

const progressKey = 'sees.radar.progress.v1';
const cacheKey = 'sees.radar.listings.v1';
type Filters = { tab: Category; q: string; open: string; mine: string; visa: boolean };
const defaults: Filters = { tab: 'scholarships', q: '', open: '', mine: '', visa: false };
function readFilters(): Filters {
    const p = new URLSearchParams(window.location.search);
    return {
        tab: categories.find(c => c.id === p.get('tab'))?.id || 'scholarships',
        q: (p.get('q') || '').slice(0, 200),
        open: ['open', 'soon', 'closed'].includes(p.get('open') || '') ? p.get('open')! : '',
        mine: myStatuses.find(s => s === p.get('mine')) || '',
        visa: p.get('visa') === 'yes',
    };
}
function readProgress(raw: string | null): Record<string, MyStatus> {
    const data: unknown = JSON.parse(raw || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([id, status]) => /^[0-9a-f-]{36}$/i.test(id) && myStatuses.includes(status as MyStatus)));
}
export function RadarBoard({ initialItems, available, initialToday }: { initialItems: Opportunity[]; available: boolean; initialToday: string }) {
    const [items, setItems] = useState(initialItems);
    const [filters, setFilters] = useState<Filters>(defaults);
    const [progress, setProgress] = useState<Record<string, MyStatus>>({});
    const [today, setToday] = useState(initialToday);
    const [ready, setReady] = useState(false);
    const [storageWarning, setStorageWarning] = useState('');
    const [cachedAt, setCachedAt] = useState('');
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    useEffect(() => {
        setFilters(readFilters());
        const refreshDate = () => setToday(localDay());
        refreshDate();
        const interval = window.setInterval(refreshDate, 60000);
        const pop = () => setFilters(readFilters());
        window.addEventListener('popstate', pop);
        try { setProgress(readProgress(localStorage.getItem(progressKey))); }
        catch { setStorageWarning('Your browser could not load saved progress. Changes will last only while this page is open unless storage becomes available.'); }
        try {
            if (available) localStorage.setItem(cacheKey, JSON.stringify({ savedAt: new Date().toISOString(), items: initialItems }));
            else {
                const cache = JSON.parse(localStorage.getItem(cacheKey) || 'null');
                if (cache && Array.isArray(cache.items) && cache.items.every(isOpportunity) && typeof cache.savedAt === 'string' && Number.isFinite(Date.parse(cache.savedAt))) {
                    setItems(cache.items); setCachedAt(cache.savedAt);
                }
            }
        } catch { /* Listings still render when browser storage is unavailable. */ }
        setReady(true);
        return () => { clearInterval(interval); window.removeEventListener('popstate', pop); };
    }, [available, initialItems]);
    function updateFilters(next: Filters) {
        setFilters(next);
        const url = new URL(window.location.href);
        for (const key of ['tab', 'q', 'open', 'mine', 'visa']) url.searchParams.delete(key);
        url.searchParams.set('tab', next.tab);
        if (next.q) url.searchParams.set('q', next.q);
        if (next.open) url.searchParams.set('open', next.open);
        if (next.mine) url.searchParams.set('mine', next.mine);
        if (next.visa && next.tab === 'uk') url.searchParams.set('visa', 'yes');
        window.history.replaceState(null, '', url);
    }
    function saveProgress(id: string, value: MyStatus) {
        let next = { ...progress, [id]: value };
        try {
            // Merge the latest stored map so another tab's unrelated changes survive.
            next = { ...readProgress(localStorage.getItem(progressKey)), ...{ [id]: value } };
            localStorage.setItem(progressKey, JSON.stringify(next));
            setStorageWarning('');
        } catch { setStorageWarning('This change is only saved for this visit. Your browser blocked saving progress; keep this page open or enable site storage.'); }
        setProgress(next);
    }
    const category = categories.find(c => c.id === filters.tab)!;
    const all = items.filter(item => item.category === filters.tab);
    const needle = filters.q.trim().toLowerCase();
    const rows = all.filter(item =>
        (!needle || [item.organisation, item.title, item.kind, item.notes].join(' ').toLowerCase().includes(needle))
        && (!filters.open || openStatus(item, today) === filters.open)
        && (!filters.mine || (progress[item.id] || 'Not applied') === filters.mine)
        && (filters.tab !== 'uk' || !filters.visa || item.visa === 'yes')
    ).sort((a, b) => sortOpportunities(a, b, today));
    return <section className="wrap radar-board" aria-label="Opportunity tracker">
        <div className="radar-intro"><p>Browse freely. Apply on the official website. Keep track of your next step here.</p><p className="radar-hint">Your application progress stays in this browser on this device. Clearing site data removes it; it does not sync to a SEES account.</p></div>
        {!available && <div className="notice error" role="status">{cachedAt ? <>Showing a saved copy from {new Date(cachedAt).toLocaleString()}. Listings may have changed or been withdrawn. Check the official source.</> : 'We couldn’t load opportunities. No saved copy is available in this browser.'} <a href="/radar">Try again</a></div>}
        {storageWarning && <p className="notice error" role="status">{storageWarning}</p>}
        <div className="radar-tabs" role="tablist" aria-label="Opportunity categories">
            {categories.map((c, index) => <Button type="button" key={c.id} id={'tab-' + c.id} role="tab" aria-selected={filters.tab === c.id} aria-controls="radar-results" tabIndex={filters.tab === c.id ? 0 : -1} ref={node => { tabs.current[index] = node; }} onClick={() => updateFilters({ ...filters, tab: c.id })} onKeyDown={event => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % categories.length;
                else if (event.key === 'ArrowLeft') next = (index + categories.length - 1) % categories.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = categories.length - 1;
                else return;
                event.preventDefault(); tabs.current[next]?.focus(); updateFilters({ ...filters, tab: categories[next].id });
            }}>{c.label}</Button>)}
        </div>
        <div className="radar-filters">
            <label className="field">Search opportunities<Input type="search" maxLength={200} placeholder="Organisation, role, subject…" value={filters.q} onChange={e => updateFilters({ ...filters, q: e.target.value })}/></label>
            <label className="field">Open status<SelectField value={filters.open} onValueChange={value => updateFilters({ ...filters, open: value })}><option value="">All opportunities</option><option value="open">Open now</option><option value="soon">Opening soon</option><option value="closed">Closed</option></SelectField></label>
            <label className="field">My status<SelectField value={filters.mine} onValueChange={value => updateFilters({ ...filters, mine: value })}><option value="">All my statuses</option>{myStatuses.map(s => <option key={s}>{s}</option>)}</SelectField></label>
            {filters.tab === 'uk' && <label className="radar-check"><Input type="checkbox" checked={filters.visa} onChange={e => updateFilters({ ...filters, visa: e.target.checked })}/>Sponsors visas only</label>}
            <Button type="button" variant="outline" onClick={() => updateFilters({ ...defaults, tab: filters.tab })}>Clear filters</Button>
        </div>
        <p role="status" className="radar-count">{rows.length} of {all.length} shown</p>
        <div id="radar-results" role="tabpanel" aria-labelledby={'tab-' + filters.tab} tabIndex={0} className="radar-table-scroll">
            <table className="radar-table"><caption className="radar-hint">{category.label} — scroll sideways to see all columns.</caption><thead><tr>{['Organisation', 'Opportunity', category.kind, 'Opens', 'Closes', 'Status', ...(filters.tab === 'uk' ? ['Sponsors visa'] : []), 'Notes / verified', 'My status'].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
                <tbody>{rows.map(item => {
                    const status = openStatus(item, today);
                    const left = item.closes ? daysLeft(item.closes, today) : null;
                    const urgent = status === 'open' && left !== null && left <= 7;
                    return <tr key={item.id}><td>{item.organisation}</td><td>{safeLink(item.link) ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title} <span aria-label="opens in a new tab">↗</span></a> : item.title}</td><td>{item.kind}</td><td>{item.opens}</td><td>{item.closes || 'Rolling'}</td><td><span className={'radar-badge ' + (urgent ? 'urgent' : status)}>{status === 'closed' ? 'Closed' : status === 'soon' ? 'Opening soon' : urgent ? left === 0 ? 'Closes today' : 'Closes in ' + left + 'd' : 'Open'}</span></td>
                        {filters.tab === 'uk' && <td>{item.visa === 'yes' ? 'Yes' : item.visa === 'no' ? 'No' : 'Unknown'}</td>}
                        <td className="radar-notes">{item.notes || '—'}<small>Last verified: {item.last_verified || 'Not recorded'}</small></td><td><SelectField disabled={!ready} aria-label={'My status for ' + item.title + ' at ' + item.organisation} value={progress[item.id] || 'Not applied'} onValueChange={value => saveProgress(item.id, value as MyStatus)}>{myStatuses.map(s => <option key={s}>{s}</option>)}</SelectField></td></tr>;
                })}</tbody></table>
            {!rows.length && <div className="empty"><h3>{all.length ? 'Nothing matches these filters.' : available ? 'The next opportunity belongs here.' : 'Opportunities are temporarily unavailable.'}</h3><p>{all.length ? 'Clear the search or change your filters.' : available ? 'Verified listings will appear here when the SEES team publishes them.' : 'Try again when the service is available.'}</p></div>}
        </div>
        <p className="radar-hint radar-footnote">Dates follow your device’s calendar. Rolling means no fixed closing date was recorded. Always confirm eligibility, the exact deadline and any sponsorship on the official listing before applying. A tracking status here does not submit an application.</p>
    </section>;
}
