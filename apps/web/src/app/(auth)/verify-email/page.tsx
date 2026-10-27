import { Input } from '@/components/ui/input';
import { AuthPage } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { verify, resend } from '@/app/actions';
import Link from 'next/link';
export const metadata = { title: 'Confirm your email', robots: { index: false, follow: false } };
export default async function Verify({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) { const { token } = await searchParams; return <AuthPage title={token ? 'One last step.' : 'Check your personal email.'} description={token ? 'Confirm this email address to finish setting up your account.' : 'Need another verification link? Enter your matric number below.'}>{token ? <ActionForm action={verify} label="Confirm my email"><Input type="hidden" name="token" value={token}/></ActionForm> : <ActionForm action={resend} label="Send another link"><label className="field">Matric number<Input name="matric" inputMode="numeric" required minLength={9} maxLength={9}/></label></ActionForm>}<div className="auth-links"><Link href="/login">Continue to sign in</Link></div></AuthPage>; }
