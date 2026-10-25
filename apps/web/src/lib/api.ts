import 'server-only';
import { cookies } from 'next/headers';
export type Person = {
    id: string;
    name: string;
    email: string;
    realm: 'member' | 'admin';
    role?: 'editor' | 'super_admin';
    matric?: string;
    level?: number | null;
    evidence?: string;
};
export type Entry = {
    id: string;
    kind: string;
    slug: string;
    title: string;
    summary: string;
    body?: string | null;
    visibility: 'public' | 'members';
    status?: string;
    version?: number;
    publish_at?: string | null;
    data: Record<string, string | number | null>;
    locked?: boolean;
};
export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}, realm: 'member' | 'admin' = 'member'): Promise<T> { const jar = await cookies(); const session = jar.get('sees_' + realm)?.value; let result: Response; try {
    result = await fetch(`${process.env.API_BASE_URL || 'http://127.0.0.1:4108'}/v1${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}), ...options.headers }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
}
catch {
    throw new ApiError(503, 'The service is temporarily unavailable. Please try again shortly.');
} const body = await result.json(); if (!result.ok)
    throw new ApiError(result.status, body.error || 'Please try again.'); return body as T; }
export async function me(realm: 'member' | 'admin' = 'member') { try {
    return await api<Person>('/me', {}, realm);
}
catch (error) {
    if (error instanceof ApiError && error.status === 401)
        return null;
    throw error;
} }
export async function listing(kind: string, q = '', level = '') { try {
    return { items: await api<Entry[]>(`/content?kind=${kind}&q=${encodeURIComponent(q)}${level ? '&level=' + encodeURIComponent(level) : ''}`), available: true };
}
catch {
    return { items: [] as Entry[], available: false };
} }
