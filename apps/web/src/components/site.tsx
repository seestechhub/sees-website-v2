import Link from 'next/link';
import { ArrowUpRight, BookOpen, ArrowRight, Layers, Radio, Users } from 'lucide-react';
import type { Entry } from '@/lib/api';
export function Logo() { return <Link href="/" className="logo" aria-label="SEES UNILAG home"><img src="/images/sees-logo.png" width="46" height="46" alt=""/><span>SEES<span className="logo-sub">UNIVERSITY OF LAGOS</span></span></Link>; }
const links = [['About', '/about'], ['Our people', '/executives'], ['Subbodies', '/subbodies'], ['Resources', '/resources'], ['Journal', '/newsletter']];
export function Header() { return <header className="site-header"><div className="header-inner"><Logo /><nav aria-label="Main navigation" className="desktop-nav">{links.map(([name, url]) => <Link key={url} href={url}>{name}</Link>)}</nav><Link href="/login" className="header-cta">Member sign in <ArrowUpRight size={17}/></Link><details className="mobile-menu"><summary aria-label="Open navigation">Menu <span>＋</span></summary><nav aria-label="Mobile navigation">{links.map(([name, url]) => <Link key={url} href={url}>{name}</Link>)}<Link href="/events">Events</Link><Link href="/contact">Contact</Link></nav></details></div></header>; }
export function Footer() { return <footer><div className="footer-top"><div><Logo /><p>One community.<br />Endless possibilities.</p></div><div><span className="eyebrow">EXPLORE</span><Link href="/executives">Our executives</Link><Link href="/events">Events & activities</Link><Link href="/subbodies">Our subbodies</Link></div><div><span className="eyebrow">FOR SEESITES</span><Link href="/resources">Resource library</Link><Link href="/register">Create your account</Link><Link href="/newsletter">The SEES journal</Link></div><div><span className="eyebrow">STAY CONNECTED</span><Link href="/contact">Get in touch <ArrowUpRight size={16}/></Link><Link href="/privacy">Privacy & your data</Link><Link href="/admin/login">Admin workspace</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SEES UNILAG</span><span>Built by the community. For the community.</span><span>ENGINEERING WHAT’S NEXT <span className="status-dot"/></span></div></footer>; }
export function PageHeading({ eyebrow, title, description }: {
    eyebrow: string;
    title: string;
    description: string;
}) { return <div className="page-heading wrap"><p className="eyebrow"><span className="status-dot"/>{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p></div>; }
export function Empty({ title, description, unavailable = false }: {
    title: string;
    description: string;
    unavailable?: boolean;
}) { return <div className="empty"><Layers size={30}/><h3>{unavailable ? 'We couldn’t load this just now.' : title}</h3><p>{unavailable ? 'Please refresh in a moment. Your saved information is safe.' : description}</p></div>; }
export function EntryCard({ entry }: {
    entry: Entry;
}) { const route = entry.kind === 'post' ? 'newsletter' : entry.kind === 'resource' ? 'resources' : entry.kind === 'event' ? 'events' : 'subbodies'; return <Link href={`/${route}/${entry.slug}`} className="entry-card"><div className="card-top"><span className="chip">{entry.data.category || entry.kind}</span><ArrowUpRight size={21}/></div><h3>{entry.title}</h3><p>{entry.summary}</p><div className="card-foot"><span>{entry.visibility === 'members' ? 'For members' : 'Open to everyone'}</span><ArrowRight size={17}/></div></Link>; }
export const features = [{ icon: BookOpen, index: '01', title: 'Learn together.', text: 'Find the notes, references and resources that help you take the next step.', href: '/resources', link: 'Explore resources' }, { icon: Users, index: '02', title: 'Find your people.', text: 'Connect with the communities bringing engineering, creativity and ideas to life.', href: '/subbodies', link: 'Meet our subbodies' }, { icon: Radio, index: '03', title: 'Stay in the loop.', text: 'The stories, conversations and opportunities shaping our community.', href: '/newsletter', link: 'Read the journal' }];
