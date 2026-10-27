import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/oswald';
import './globals.css';
import './ui.css';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3108'),
    title: {
        default: 'SEES UNILAG — Engineering what’s next',
        template: '%s | SEES UNILAG',
    },
    description: 'The home of Electrical, Electronics and Computer Engineering students at the University of Lagos. Learn, connect and build together.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <a className="skip-link" href="#main">Skip to content</a>
                {children}
            </body>
        </html>
    );
}
