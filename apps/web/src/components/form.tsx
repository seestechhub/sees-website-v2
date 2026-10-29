'use client';
import { Button } from './ui/button';
import { useActionState, type ReactNode } from 'react';
import type { FormState } from '../app/actions';
export function ActionForm({ action, children, label, className = '' }: {
    action: (state: FormState, form: FormData) => Promise<FormState>;
    children: ReactNode;
    label: string;
    className?: string;
}) { const [state, submit, pending] = useActionState(action, {}); return <form action={submit} className={'form ' + className}>{children}{state.error && <p className="notice error" role="alert">{state.error}</p>}{state.message && <p className="notice" role="status">{state.message}</p>}<Button variant="default" disabled={pending}>{pending ? 'Please wait…' : label}<span aria-hidden>↗</span></Button></form>; }
