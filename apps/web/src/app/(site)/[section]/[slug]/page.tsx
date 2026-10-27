import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError, type Entry } from '@/lib/api';
export default async function Detail({ params }: {
    params: Promise<{
        section: string;
        slug: string;
    }>;
}) { const { section, slug } = await params; const kind = ({ newsletter: 'post', resources: 'resource', events: 'event', subbodies: 'subbody', pages: 'page' } as Record<string, string>)[section]; if (!kind)
    notFound(); let item: Entry; try {
    item = await api(`/content/${kind}/${encodeURIComponent(slug)}`);
}
catch (e) {
    if (e instanceof ApiError && e.status === 404)
        notFound();
    throw e;
} return <article className="article"><Link href={section === 'pages' ? '/about' : `/${section}`} className="text-link">← Back to {section === 'newsletter' ? 'the journal' : section === 'pages' ? 'SEES' : section}</Link><p className="eyebrow" style={{ marginTop: 32 }}>{String(item.data.category || kind)}</p><h1>{item.title}</h1><p className="lead">{item.summary}</p>{item.locked ? <div className="member-panel"><h2>A little more for our members.</h2><p>Sign in to your SEES account to continue.</p><Button asChild variant="default"><Link href="/login" className="button primary" style={{ marginTop: 20 }}>Member sign in ↗</Link></Button></div> : <><div className="prose">{item.body}</div>{item.data.url && <a href={String(item.data.url)} className="button primary" target="_blank" rel="noopener noreferrer" style={{ marginTop: 30 }}>Open {kind === 'resource' ? 'resource' : 'link'} ↗</a>}{item.data.location && <p style={{ marginTop: 20 }}>Location: {item.data.location}</p>}</>}</article>; }
