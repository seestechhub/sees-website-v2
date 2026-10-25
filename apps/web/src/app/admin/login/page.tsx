import { AuthPage } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { login } from '@/app/actions';
export const metadata = { title: 'Admin sign in', robots: { index: false } };
export default function AdminLogin() { return <AuthPage title="The community workspace." description="Sign in with your administrator account and authenticator code."><ActionForm action={login} label="Open workspace"><input type="hidden" name="realm" value="admin"/><label className="field">Admin email<input type="email" name="identifier" required autoComplete="username"/></label><label className="field">Password<input type="password" name="password" required maxLength={128} autoComplete="current-password"/></label><label className="field">Authenticator code<input name="code" pattern="[0-9]{6}" maxLength={6} required inputMode="numeric" autoComplete="one-time-code"/></label></ActionForm></AuthPage>; }
