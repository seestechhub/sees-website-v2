export const categories = [
    { id: 'scholarships', label: 'Scholarships', kind: 'Level' },
    { id: 'uk', label: 'UK Internships (Visa Sponsorship)', kind: 'Type' },
    { id: 'nigeria_internships', label: 'Nigeria Internships', kind: 'Sector' },
    { id: 'nigeria_jobs', label: 'Nigeria Jobs', kind: 'Sector' },
] as const;
export const myStatuses = ['Not applied', 'Interested', 'Application submitted', 'Online assessment', 'Interview', 'Offer received', 'Rejected', 'Not interested'] as const;
export type Category = typeof categories[number]['id'];
export type MyStatus = typeof myStatuses[number];
export type Opportunity = {
    id: string; category: Category; organisation: string; title: string; kind: string;
    opens: string; closes: string | null; visa: 'yes' | 'no' | 'unknown'; notes: string;
    link: string; last_verified: string | null;
};
export type EditorialOpportunity = Opportunity & { status: 'draft' | 'published' | 'archived'; version: number };
export function localDay(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function openStatus(item: Opportunity, today: string) {
    if (item.closes && item.closes < today) return 'closed';
    if (item.opens > today) return 'soon';
    return 'open';
}
// ISO calendar days, not elapsed local hours: daylight-saving transitions do not alter this count.
export function daysLeft(closes: string, today: string) {
    return Math.round((Date.parse(closes + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}
export function sortOpportunities(a: Opportunity, b: Opportunity, today: string) {
    const order = { open: 0, soon: 1, closed: 2 };
    return order[openStatus(a, today)] - order[openStatus(b, today)]
        || (a.closes || '9999-12-31').localeCompare(b.closes || '9999-12-31')
        || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}
export function safeLink(value: string) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
}
export function isOpportunity(value: unknown): value is Opportunity {
    if (!value || typeof value !== 'object') return false;
    const row = value as Record<string, unknown>;
    return ['id', 'organisation', 'title', 'kind', 'notes', 'link'].every(key => typeof row[key] === 'string')
        && categories.some(x => x.id === row.category) && ['yes', 'no', 'unknown'].includes(String(row.visa))
        && typeof row.opens === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.opens)
        && (row.closes === null || typeof row.closes === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.closes))
        && (row.last_verified === null || typeof row.last_verified === 'string');
}
