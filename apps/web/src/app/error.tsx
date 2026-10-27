'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <main id="main" className="not-found"><p className="eyebrow" style={{ justifyContent: 'center' }}>LET’S TRY THAT AGAIN</p><h1>A brief interruption.</h1><p>We couldn’t load this page. Please try again in a moment.</p><Button variant="default" onClick={reset}>Try again ↗</Button></main>; }

