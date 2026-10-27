import { Input } from '@/components/ui/input';
import { ActionForm } from '@/components/form';
import { AuthPage } from '@/components/auth-page';
import { confirmSubscription } from '@/app/actions';
export const metadata = { title: 'Confirm your subscription', robots: { index: false } };
export default async function Confirm({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) {
    const { token } = await searchParams;
    return <AuthPage title="Stay connected." description="Confirm that you’d like to receive the SEES newsletter.">
    {token ? <ActionForm action={confirmSubscription} label="Confirm my subscription"><Input name="token" type="hidden" value={token}/></ActionForm> : <p>This link is incomplete. Request a new confirmation from the journal.</p>}
  </AuthPage>;
}
