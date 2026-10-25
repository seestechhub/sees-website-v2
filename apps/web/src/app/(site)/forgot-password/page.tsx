import { AuthPage } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { forgot } from '@/app/actions';
export const metadata = { title: 'Reset your password' };
export default function Forgot() { return <AuthPage title="Let’s get you back in." description="Enter your matric number. We’ll send a reset link to the verified personal email on your account."><ActionForm action={forgot} label="Send reset link"><label className="field">Matric number<input name="matric" inputMode="numeric" required minLength={9} maxLength={9}/></label></ActionForm></AuthPage>; }
