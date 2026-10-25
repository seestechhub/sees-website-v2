import { api } from '@/lib/api';
type Event = {
    id: string;
    action: string;
    actor_id: string | null;
    target_id: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
};
export default async function Audit() { const events = await api<Event[]>('/admin/audit', {}, 'admin'); return <><p className="eyebrow">ACCOUNTABILITY</p><h1>A clear record of every step.</h1><p style={{ marginBottom: 25 }}>Sensitive actions are recorded. Audit history cannot be edited through the application.</p><div className="table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{new Date(e.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })} WAT</td><td>{e.action.replaceAll('.', ' / ')}</td><td>{e.actor_id?.slice(0, 8) || 'System'}</td><td>{JSON.stringify(e.metadata)}</td></tr>)}</tbody></table></div></>; }
