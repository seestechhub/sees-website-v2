import { Input } from '@/components/ui/input';
import Link from 'next/link';
export function AuthPage({ title, description, children }: {
    title: string;
    description: string;
    children: React.ReactNode;
}) { return <section className="auth-layout"><aside className="auth-aside"><div><p className="eyebrow">YOUR SEES COMMUNITY</p><h2>A PLACE TO LEARN.<br />PEOPLE TO BUILD WITH.<br /><span>A FUTURE TO SHAPE.</span></h2><p>Your community, your resources, your next chapter. Stay connected to everything happening at SEES.</p></div><p className="aside-foot">ELECTRICAL · ELECTRONICS · COMPUTER ENGINEERING</p></aside><div className="auth-main"><h1>{title}</h1><p>{description}</p>{children}<div className="auth-links"><Link href="/">← Back to the website</Link><Link href="/contact">Need a hand?</Link></div></div></section>; }
export function PasswordFields() { return <><label className="field">Password<Input name="password" type="password" minLength={15} maxLength={128} required autoComplete="new-password"/><small>Use a memorable passphrase of at least 15 characters.</small></label><label className="field">Confirm password<Input name="confirm" type="password" required minLength={15} maxLength={128} autoComplete="new-password"/></label></>; }
