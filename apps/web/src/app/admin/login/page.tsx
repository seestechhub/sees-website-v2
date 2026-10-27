import { Input } from '@/components/ui/input';
import { AuthPage } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { login } from '@/app/actions';
export const metadata = { title: 'Admin sign in', robots: { index: false } };
export default function AdminLogin() { return <AuthPage title="The community workspace." description="Sign in with your administrator account and authenticator code."><ActionForm action={login} label="Open workspace"><Input type="hidden" name="realm" value="admin"/><label className="field">Admin email<Input type="email" name="identifier" required autoComplete="username"/></label><label className="field">Password<Input type="password" name="password" required maxLength={128} autoComplete="current-password"/></label><label className="field">Authenticator code<Input name="code" pattern="[0-9]{6}" maxLength={6} required inputMode="numeric" autoComplete="one-time-code"/></label></ActionForm></AuthPage>; }
