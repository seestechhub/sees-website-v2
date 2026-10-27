import { Header } from '@/components/site';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <><Header/><main id="main">{children}</main></>;
}
