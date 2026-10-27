import { Input } from '@/components/ui/input';
import { AuthPage, PasswordFields } from '@/components/auth-page';
import { ActionForm } from '@/components/form';
import { resetPassword } from '@/app/actions';
import Link from 'next/link';
export const metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };
export default async function Reset({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) { const { token } = await searchParams; return <AuthPage title="A fresh start." description="Choose a new passphrase for your account. Reset links work once and expire after 30 minutes.">{token ? <ActionForm action={resetPassword} label="Update password"><Input type="hidden" name="token" value={token}/><PasswordFields /></ActionForm> : <p className="notice">Open the reset link sent to your personal email.</p>}<div className="auth-links"><Link href="/login">Back to sign in</Link></div></AuthPage>; }
