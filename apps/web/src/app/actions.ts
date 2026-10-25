'use server';
import { fromLagosInput } from '@/lib/time';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
export type FormState = {
    error?: string;
    message?: string;
};
const field = (form: FormData, key: string) => String(form.get(key) || '');
const failure = (e: unknown): FormState => ({ error: e instanceof ApiError ? e.message : 'Please check the form and try again.' });
export async function register(_state: FormState, form: FormData): Promise<FormState> { if (field(form, 'password') !== field(form, 'confirm'))
    return { error: 'Your passwords do not match.' }; try {
    return await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: field(form, 'name'), email: field(form, 'email').trim(), matric: field(form, 'matric'), password: field(form, 'password'), consent: form.get('consent') === 'on' }) });
}
catch (e) {
    return failure(e);
} }
export async function login(_state: FormState, form: FormData): Promise<FormState> { const realm = field(form, 'realm') === 'admin' ? 'admin' : 'member'; try {
    const result = await api<{
        token: string;
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: field(form, 'identifier'), password: field(form, 'password'), realm, code: field(form, 'code') }) }, realm);
    (await cookies()).set('sees_' + realm, result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: realm === 'admin' ? 8 * 3600 : 7 * 24 * 3600 });
}
catch (e) {
    return failure(e);
} redirect(realm === 'admin' ? '/admin' : '/account'); }
export async function logout(form: FormData) { const realm = field(form, 'realm') === 'admin' ? 'admin' : 'member'; try {
    await api('/auth/logout', { method: 'POST' }, realm);
}
catch { } (await cookies()).delete('sees_' + realm); redirect(realm === 'admin' ? '/admin/login' : '/'); }
export async function forgot(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ matric: field(form, 'matric') }) });
}
catch (e) {
    return failure(e);
} }
export async function resend(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/auth/resend', { method: 'POST', body: JSON.stringify({ matric: field(form, 'matric') }) });
}
catch (e) {
    return failure(e);
} }
export async function verify(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/auth/verify', { method: 'POST', body: JSON.stringify({ token: field(form, 'token') }) });
}
catch (e) {
    return failure(e);
} }
export async function resetPassword(_state: FormState, form: FormData): Promise<FormState> { if (field(form, 'password') !== field(form, 'confirm'))
    return { error: 'Your passwords do not match.' }; try {
    return await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: field(form, 'token'), password: field(form, 'password') }) });
}
catch (e) {
    return failure(e);
} }
export async function saveContent(_state: FormState, form: FormData): Promise<FormState> { const id = field(form, 'id'); const data: Record<string, unknown> = {}; for (const key of ['course', 'category', 'url', 'image', 'role', 'session', 'location']) {
    if (field(form, key))
        data[key] = field(form, key);
} if (field(form, 'level'))
    data.level = Number(field(form, 'level')); try {
    if (field(form, 'starts_at'))
        data.starts_at = fromLagosInput(field(form, 'starts_at'));
    await api('/admin/content' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify({ kind: field(form, 'kind'), slug: field(form, 'slug'), title: field(form, 'title'), summary: field(form, 'summary'), body: field(form, 'body'), visibility: field(form, 'visibility'), status: field(form, 'status'), publish_at: field(form, 'publish_at') ? fromLagosInput(field(form, 'publish_at')) : null, version: id ? Number(field(form, 'version')) : undefined, data }) }, 'admin');
}
catch (e) {
    return failure(e);
} revalidatePath('/', 'layout'); redirect('/admin/content?saved=1'); }
export async function updateMember(_state: FormState, form: FormData): Promise<FormState> { try {
    await api('/admin/members/' + field(form, 'id'), { method: 'PATCH', body: JSON.stringify({ status: field(form, 'status'), reason: field(form, 'reason') }) }, 'admin');
    revalidatePath('/admin/members');
    return { message: 'Member status updated.' };
}
catch (e) {
    return failure(e);
} }
export async function subscribe(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email: field(form, 'email'), consent: form.get('consent') === 'on' }) });
}
catch (e) {
    return failure(e);
} }
export async function confirmSubscription(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/newsletter/confirm', { method: 'POST', body: JSON.stringify({ token: field(form, 'token') }) });
}
catch (e) {
    return failure(e);
} }
export async function unsubscribe(_state: FormState, form: FormData): Promise<FormState> { try {
    return await api('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ token: field(form, 'token') }) });
}
catch (e) {
    return failure(e);
} }
