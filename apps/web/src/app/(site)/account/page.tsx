import Link from 'next/link';
import { redirect } from 'next/navigation';
import { me } from '@/lib/api';
import { PageHeading } from '@/components/site';
import { logout } from '@/app/actions';
import { ArrowUpRight } from 'lucide-react';
export const metadata = { title: 'Your SEES account', robots: { index: false } };
export default async function Account() { const person = await me(); if (person?.realm !== 'member')
    redirect('/login'); return <><PageHeading eyebrow="YOUR MEMBER SPACE" title={`Welcome, ${person.name.split(' ')[0]}.`} description="A little less searching. A lot more connection."/><div className="wrap page-content"><div className="member-top"><span className="chip">SEES MEMBER</span><form action={logout}><button className="button outline">Sign out</button></form></div><div className="member-panel"><h2>Your next step is here.</h2><p>Explore the resource library or catch up with the latest from your community.</p><div className="member-actions"><Link href="/resources" className="button primary">Find resources <ArrowUpRight size={18}/></Link><Link href="/newsletter" className="button outline">Read the journal <ArrowUpRight size={18}/></Link></div></div><div className="feature-grid"><div className="feature"><p className="eyebrow">MATRIC NUMBER</p><h3>{person.matric}</h3></div><div className="feature"><p className="eyebrow">PERSONAL EMAIL</p><p>{person.email}</p></div><div className="feature"><p className="eyebrow">ACCOUNT SECURITY</p><Link href="/forgot-password" className="text-link">Reset your password <ArrowUpRight size={16}/></Link></div></div></div></>; }
