import { SelectField } from '@/components/ui/select-field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ActionForm } from '@/components/form';
import { updateMember } from '@/app/actions';
import { Empty } from '@/components/site';
type Member = {
    id: string;
    name: string;
    email: string;
    matric: string;
    status: string;
    evidence: string;
    verified_at: string | null;
};
export default async function Members() { const members = await api<Member[]>('/admin/members', {}, 'admin'); return <><p className="eyebrow">MEMBERSHIP</p><h1>People at the centre.</h1><p style={{ marginBottom: 25 }}>Format validation and email verification do not independently prove student identity. Access to this directory is recorded.</p>{members.length ? <div className="table-wrap"><table><thead><tr><th>Member</th><th>Matric</th><th>Personal email</th><th>Evidence</th><th>Account</th><th>Manage</th></tr></thead><tbody>{members.map(m => <tr key={m.id}><td>{m.name}</td><td>{m.matric}</td><td>{m.email}</td><td>{m.evidence.replaceAll('_', ' ')}<br />{m.verified_at ? 'Email confirmed' : 'Awaiting email'}</td><td>{m.status}</td><td><details><summary>Change status</summary><ActionForm action={updateMember} label="Update"><Input type="hidden" name="id" value={m.id}/><label className="field">Status<SelectField name="status" defaultValue={m.status}><option>active</option><option>review</option><option>deactivated</option></SelectField></label><label className="field">Reason<Input name="reason" required minLength={3}/></label></ActionForm></details></td></tr>)}</tbody></table></div> : <Empty title="Your community will grow here." description="Registered member accounts will appear in this private directory."/>}</>; }
