import Link from 'next/link';
import { redirect } from 'next/navigation';
import { me } from '@/lib/api';
import { logout } from '@/app/actions';
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: {
    children: React.ReactNode;
}) { const person = await me('admin'); if (person?.realm !== 'admin')
    redirect('/admin/login'); return <div className="admin-shell"><aside className="admin-nav"><p className="eyebrow">SEES WORKSPACE</p><Link href="/admin">Overview</Link><Link href="/admin/content">Content & resources</Link><Link href="/admin/content/new">Create something</Link>{person.role === 'super_admin' && <><Link href="/admin/members">Members</Link><Link href="/admin/audit">Audit history</Link></>}<Link href="/">View website ↗</Link><form action={logout}><input type="hidden" name="realm" value="admin"/><button className="button outline">Sign out</button></form></aside><div className="admin-main">{children}</div></div>; }
