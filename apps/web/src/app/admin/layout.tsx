import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: { default: 'SEES workspace', template: '%s | SEES workspace' },
    robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return <main id="main" className="admin-root">{children}</main>;
}
