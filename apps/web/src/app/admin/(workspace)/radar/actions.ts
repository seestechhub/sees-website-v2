'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { FormState } from '@/app/actions';

export async function saveOpportunity(_state: FormState, form: FormData): Promise<FormState> {
    const field = (key: string) => String(form.get(key) || '');
    const id = field('id');
    const category = field('category');
    try {
        await api('/admin/radar' + (id ? '/' + encodeURIComponent(id) : ''), {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify({
                category, organisation: field('organisation'), title: field('title'), kind: field('kind'),
                opens: field('opens'), closes: field('closes') || null,
                visa: category === 'uk' ? field('visa') : 'unknown',
                notes: field('notes'), link: field('link'), last_verified: field('last_verified') || null,
                status: field('status'), version: id ? Number(field('version')) : undefined,
            }),
        }, 'admin');
    } catch (error) {
        return { error: error instanceof ApiError ? error.message : 'The listing could not be saved. Check the fields and try again.' };
    }
    revalidatePath('/radar');
    revalidatePath('/admin/radar');
    redirect('/admin/radar?saved=1');
}
