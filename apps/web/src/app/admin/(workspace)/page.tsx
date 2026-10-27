import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { api, me } from '@/lib/api';
export default async function Admin() { const [person, stats] = await Promise.all([me('admin'), api<{
        content: {
            kind: string;
            count: number;
        }[];
        members: {
            total: number;
            active: number;
        } | null;
    }>('/admin/overview', {}, 'admin')]); return <><p className="eyebrow">YOUR COMMUNITY, IN VIEW</p><h1>Welcome back, {person?.name.split(' ')[0]}.</h1><p>Manage the content and connections that keep SEES moving.</p><div className="stat-grid">{['post', 'resource', 'event'].map(kind => <div className="stat" key={kind}><p>{kind === 'post' ? 'Journal posts' : kind + 's'}</p><strong>{stats.content.find(x => x.kind === kind)?.count || 0}</strong></div>)}{stats.members && <><div className="stat"><p>Registered accounts</p><strong>{stats.members.total}</strong></div><div className="stat"><p>Active, email-verified accounts</p><strong>{stats.members.active}</strong></div></>}</div><div className="member-panel"><h2>Make the next update count.</h2><p>Draft a story, add a resource or introduce the people shaping our community. Publishing updates the website; it does not send an email campaign.</p><div className="member-actions"><Button asChild variant="default"><Link className="button primary" href="/admin/content/new">Create content ↗</Link></Button><Button asChild variant="outline"><Link className="button outline" href="/admin/content">Manage existing content</Link></Button></div></div></>; }
