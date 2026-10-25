import Link from 'next/link';
import { AuthPage, PasswordFields } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { register } from '@/app/actions';
import { api } from '@/lib/api';
export const metadata = { title: 'Join the community' };
export default async function Register() { let policy: {
    years: string[];
    faculty: string;
    departments: string[];
} | null = null; try {
    policy = await api('/policy');
}
catch { } const pattern = policy ? `(${policy.years.join('|')})${policy.faculty}(${policy.departments.join('|')})[0-9]{3}` : '[0-9]{9}'; return <AuthPage title="Your community starts here." description="Create your member account with your matric number and a personal email you can access."><ActionForm action={register} label="Create my account"><label className="field">Full name<input name="name" autoComplete="name" required maxLength={160}/></label><label className="field">Matric number<input name="matric" inputMode="numeric" pattern={pattern} maxLength={9} minLength={9} required title="Enter your eligible nine-digit matric number."/><small>Nine digits. Engineering faculty 04, department 03 or 08.</small></label><label className="field">Personal email<input name="email" type="email" autoComplete="email" required/><small>We’ll send verification and password-recovery links here.</small></label><PasswordFields /><label className="checkbox"><input name="consent" type="checkbox" required/><span>I have read the <Link href="/privacy">privacy notice</Link> and understand how my account information is used.</span></label></ActionForm><div className="auth-links"><Link href="/login">Already a member? Sign in</Link><Link href="/verify-email">Resend verification</Link></div></AuthPage>; }
