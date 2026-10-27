import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { Opportunity } from '@/lib/radar';
import { PageHeading } from '@/components/site';
import { RadarBoard } from '@/components/radar-board';
import './radar.css';

export const metadata: Metadata = {
    title: 'RADAR',
    description: 'Opportunities worth your attention. Scholarships, internships and jobs, with application progress saved on your device.',
    openGraph: { title: 'RADAR | SEES UNILAG', description: 'Opportunities worth your attention.', images: ['/images/sees-logo.png'] },
};
export default async function RadarPage() {
    let items: Opportunity[] = [];
    let available = true;
    try { items = await api<Opportunity[]>('/radar'); } catch { available = false; }
    return <div className="radar-page"><PageHeading eyebrow="THE SEES OPPORTUNITY TRACKER" title="RADAR" description="Opportunities worth your attention."/>
        <RadarBoard initialItems={items} available={available} initialToday={new Date().toISOString().slice(0, 10)}/>
    </div>;
}
