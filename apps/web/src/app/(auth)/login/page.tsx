import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { AuthPage } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { login } from '@/app/actions';
export const metadata = { title: 'Member sign in' };
export default function Login() { return <AuthPage title="Good to have you back." description="Sign in to your SEES account to pick up where you left off."><ActionForm action={login} label="Sign in"><Input type="hidden" name="realm" value="member"/><label className="field">Matric number<Input name="identifier" inputMode="numeric" autoComplete="username" maxLength={9} required/></label><label className="field">Password<Input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label></ActionForm><div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/register">Create an account</Link><Link href="/verify-email">Confirm your email</Link></div></AuthPage>; }
