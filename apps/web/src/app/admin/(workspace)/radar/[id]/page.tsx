import { SelectField } from '@/components/ui/select-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { categories, type EditorialOpportunity } from '@/lib/radar';
import { ActionForm } from '@/components/form';
import { saveOpportunity } from '../actions';

export default async function RadarEditor({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let item: EditorialOpportunity | undefined;
    if (id !== 'new') {
        if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
        try { item = await api<EditorialOpportunity>('/admin/radar/' + id, {}, 'admin'); }
        catch (error) { if (error instanceof ApiError && [400, 404].includes(error.status)) notFound(); throw error; }
    }
    return <><p className="eyebrow">RADAR EDITORIAL DESK</p><h1>{item ? 'Update an opportunity.' : 'Put it on the radar.'}</h1>
        <p style={{ marginBottom: 24 }}>Use the official application page. Check eligibility, deadlines and role-specific sponsorship. Mark uncertain sponsorship as Unknown.</p>
        <ActionForm action={saveOpportunity} label="Save opportunity" className="editor">
            <Input type="hidden" name="id" value={item?.id || ''}/><Input type="hidden" name="version" value={item?.version || ''}/>
            <div className="form-grid">
                <label className="field">Category<SelectField name="category" defaultValue={item?.category || 'scholarships'}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</SelectField></label>
                <label className="field">Organisation<Input name="organisation" required maxLength={160} defaultValue={item?.organisation}/></label>
                <label className="field full">Opportunity title<Input name="title" required maxLength={200} defaultValue={item?.title}/></label>
                <label className="field">Level / type / sector<Input name="kind" required maxLength={100} defaultValue={item?.kind}/><small>Scholarship level, UK internship type, or Nigerian industry sector.</small></label>
                <label className="field">Visa sponsorship (UK only)<SelectField name="visa" defaultValue={item?.visa || 'unknown'}><option value="unknown">Unknown</option><option value="yes">Yes — confirmed for this opportunity</option><option value="no">No</option></SelectField></label>
                <label className="field">Opens<Input type="date" name="opens" required defaultValue={item?.opens}/></label>
                <label className="field">Closes<Input type="date" name="closes" defaultValue={item?.closes || ''}/><small>Leave blank for rolling applications.</small></label>
                <label className="field full">Official application link<Input type="url" name="link" required maxLength={2048} defaultValue={item?.link}/></label>
                <label className="field full">Notes<Textarea name="notes" maxLength={2000} defaultValue={item?.notes}/><small>Eligibility, location, exact deadline/timezone and source evidence where relevant. Plain text only.</small></label>
                <label className="field">Last verified<Input type="date" name="last_verified" defaultValue={item?.last_verified || ''}/><small>Required to publish. Enter the date you checked the official listing.</small></label>
                <label className="field">Publication status<SelectField name="status" defaultValue={item?.status || 'draft'}><option value="draft">Draft</option><option value="published">Published — visible to everyone</option><option value="archived">Archived — hidden from public RADAR</option></SelectField></label>
            </div>
        </ActionForm>
    </>;
}
