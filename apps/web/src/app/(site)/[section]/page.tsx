import { Subscribe } from '@/components/subscribe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listing } from '@/lib/api';
import { PageHeading, Empty, EntryCard } from '@/components/site';
const sections: Record<string, {
    kind: string;
    eyebrow: string;
    title: string;
    description: string;
}> = { resources: { kind: 'resource', eyebrow: 'THE SEES LIBRARY', title: 'A little help. A long way.', description: 'Notes, references and learning resources, organised around your next step.' }, newsletter: { kind: 'post', eyebrow: 'THE SEES JOURNAL', title: 'Our stories. Our perspective.', description: 'News, ideas and conversations from across the SEES community.' }, events: { kind: 'event', eyebrow: 'GET INVOLVED', title: 'See you at the next one.', description: 'Find the gatherings, activities and experiences bringing our community together.' }, executives: { kind: 'executive', eyebrow: 'MEET OUR PEOPLE', title: 'Here to serve. Ready to lead.', description: 'Meet the people representing our community and helping move SEES forward.' }, subbodies: { kind: 'subbody', eyebrow: 'FIND YOUR PEOPLE', title: 'Different interests. Shared energy.', description: 'Explore the communities within SEES and find a place to contribute.' } };
export async function generateMetadata({ params }: {
    params: Promise<{
        section: string;
    }>;
}) { const { section } = await params; return { title: sections[section]?.title || section }; }
export default async function Section({ params, searchParams }: {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<{
        q?: string;
        level?: string;
    }>;
}) {
    const { section } = await params;
    const filter = await searchParams;
    if (section === 'about')
        return <><PageHeading eyebrow="ABOUT OUR SOCIETY" title="Engineering is a team effort." description="SEES is the student community for Electrical, Electronics and Computer Engineering at the University of Lagos."/><div className="wrap page-content"><div className="about-grid"><img src="/images/engineering.webp" alt="Engineers collaborating at a solar installation"/><div className="prose"><h2>Connected by what’s possible.</h2><p>Our community brings students together to learn, exchange ideas and contribute. Through academic resources, student-led communities and shared experiences, SEES helps you find your place and move forward.</p><Link href="/subbodies" className="button primary">Explore our communities ↗</Link></div></div></div></>;
    if (section === 'contact')
        return <><PageHeading eyebrow="LET’S CONNECT" title="Every conversation starts somewhere." description="Connect with the SEES executive team for community enquiries, membership support and opportunities to collaborate."/><div className="wrap page-content"><div className="member-panel"><h2>Find us at UNILAG.</h2><p>University of Lagos, Akoka, Lagos, Nigeria.</p><p>Our verified Society contact channels will be published here once confirmed.</p></div><Link href="/executives" className="button primary">Meet the executive team ↗</Link></div></>;
    if (section === 'privacy')
        return <><PageHeading eyebrow="YOUR DATA" title="Your account. Your information." description="A straightforward explanation of the information this platform uses."/><div className="wrap page-content prose"><p>This is the development privacy notice for the SEES platform. The Society must confirm its accountable contact and retention policy before public registration opens.</p><h2>What we collect</h2><p>Member registration uses your name, matric number, personal email and a securely hashed password. We use your matric format to check eligibility, and your personal email for verification and password recovery. Format validation does not independently confirm your identity.</p><h2>Who can access it</h2><p>Your account information is private. Authorised membership administrators can manage student records; content editors cannot access that directory. Sensitive administrative activity is recorded.</p><h2>Email and choices</h2><p>Account emails help you verify or recover access. Registering does not subscribe you to a newsletter. Contact the Society for account corrections or deletion requests while self-service settings are being completed.</p><h2>Storage</h2><p>The planned service uses a Vercel frontend and a Render backend and database. Operational providers, retention periods and the final privacy contact will be documented before launch.</p></div></>;
    if (section === 'posting-guidelines')
        return <><PageHeading eyebrow="EDITORIAL GUIDELINES" title="Share with care." description="Publish accurate, respectful and useful material for the SEES community."/><div className="wrap page-content prose"><p>Verify names, dates and links. Use images and resources you have permission to share. Keep personal student information out of public posts. Make visibility and publication timing deliberate, and correct mistakes promptly.</p></div></>;
    const config = sections[section];
    if (!config)
        notFound();
    const result = await listing(config.kind, filter.q, filter.level);
    return <><PageHeading {...config}/><section className="wrap page-content">{['resources', 'newsletter', 'events'].includes(section) && <form className="filter-bar"><label>Search {section === 'newsletter' ? 'stories' : section}<input name="q" defaultValue={filter.q} placeholder={section === 'resources' ? 'Course code or resource title' : 'What are you looking for?'}/></label>{section === 'resources' && <label>Level<select name="level" defaultValue={filter.level || ''}><option value="">All levels</option>{[100, 200, 300, 400, 500].map(l => <option key={l}>{l}</option>)}</select></label>}<button className="button primary">Find {section === 'newsletter' ? 'stories' : section} ↗</button></form>}{result.items.length ? <div className="entry-grid">{result.items.map(entry => section === 'executives' ? <article className="person-card" key={entry.id}>{entry.data.image && <img src={String(entry.data.image)} alt={entry.title}/>}<p className="eyebrow">{entry.data.role}</p><h3>{entry.title}</h3><p>{entry.summary}</p><span className="chip">{entry.data.session}</span></article> : <EntryCard entry={entry} key={entry.id}/>)}</div> : <Empty title={filter.q || filter.level ? 'Nothing matches just yet.' : section === 'executives' ? 'Our next leadership chapter is taking shape.' : 'There’s more to come.'} description={filter.q || filter.level ? 'Try another search or choose a different level.' : section === 'executives' ? 'The approved executive profiles and President’s address will appear here.' : 'New updates will appear here as they are published.'} unavailable={!result.available}/>} {section === 'newsletter' && <Subscribe />}</section></>;
}
