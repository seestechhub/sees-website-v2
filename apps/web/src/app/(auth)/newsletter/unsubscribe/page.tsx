import { Input } from '@/components/ui/input';
import { ActionForm } from '@/components/form';
import { AuthPage } from '@/components/auth-page';
import { unsubscribe } from '@/app/actions';
export const metadata = { title: 'Unsubscribe', robots: { index: false } };
export default async function Unsubscribe({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) {
    const { token } = await searchParams;
    return <AuthPage title="Your inbox. Your choice." description="Leave the newsletter with one click. Your SEES account stays available.">
    {token ? <ActionForm action={unsubscribe} label="Unsubscribe from the newsletter"><Input name="token" type="hidden" value={token}/></ActionForm> : <p>Please open the unsubscribe link from your email.</p>}
  </AuthPage>;
}
