import { Button } from '@/components/ui/button';
import Link from 'next/link';
export default function NotFound() { return <main id="main" className="not-found"><p className="eyebrow" style={{ justifyContent: 'center' }}>A SMALL DETOUR</p><h1>Not quite here.</h1><p>This page may have moved, or is still waiting to be published.</p><Button asChild variant="default"><Link href="/" className="button primary">Back to the community ↗</Link></Button></main>; }

