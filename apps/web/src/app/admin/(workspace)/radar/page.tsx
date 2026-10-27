import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { api } from '@/lib/api';
import { categories, type EditorialOpportunity } from '@/lib/radar';

export default async function RadarAdmin() {
    const items = await api<EditorialOpportunity[]>('/admin/radar', {}, 'admin');
    return <><p className="eyebrow">RADAR EDITORIAL DESK</p><h1>Opportunities worth sharing.</h1>
        <p>Check the official source before publishing. Edit or archive outdated listings; visitor progress stays on their device.</p>
        <p style={{ margin: '24px 0' }}><Button asChild variant="default"><Link className="button primary" href="/admin/radar/new">Add opportunity ↗</Link></Button> <Button asChild variant="outline"><Link className="button outline" href="/radar">View RADAR ↗</Link></Button></p>
        <div className="table-wrap"><table><thead><tr><th scope="col">Opportunity</th><th scope="col">Category</th><th scope="col">Publication</th><th scope="col">Closes</th><th scope="col">Verified</th></tr></thead>
            <tbody>{items.map(item => <tr key={item.id}><td><Link href={'/admin/radar/' + item.id}>{item.title}</Link><br/><small>{item.organisation}</small></td><td>{categories.find(c => c.id === item.category)?.label}</td><td>{item.status}</td><td>{item.closes || 'Rolling'}</td><td>{item.last_verified || 'Not verified'}</td></tr>)}</tbody></table>
            {!items.length && <div className="empty"><h3>No opportunities yet.</h3><p>Create a draft, verify its source, then publish it.</p></div>}
        </div></>;
}
