import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { SelectField } from '../src/components/ui/select-field';
import AuthLayout from '../src/app/(auth)/layout';
import SiteLayout from '../src/app/(site)/layout';

test('authentication layout omits the footer while public pages retain it', () => {
    const auth = renderToStaticMarkup(<AuthLayout><p>Authentication form</p></AuthLayout>);
    assert.ok(auth.includes('Authentication form'));
    assert.ok(auth.includes('id="main"'));
    assert.equal(auth.includes('<footer'), false);
    assert.ok(renderToStaticMarkup(<SiteLayout><p>Public page</p></SiteLayout>).includes('<footer'));
});
test('selects preserve real form values, including the empty all-levels option', () => {
    for (const value of ['', '200']) {
        const html = renderToStaticMarkup(<form><SelectField name="level" defaultValue={value}><option value="">All levels</option><option value="200">200</option></SelectField></form>);
        assert.ok(html.includes('name="level" value="' + value + '"'));
        assert.ok(html.includes('role="combobox"'));
        assert.ok(!html.includes('name="level" value="__sees_empty_option__"'));
    }
});
test('controlled application statuses render without being changed to a default', () => {
    const html = renderToStaticMarkup(<SelectField value="Interview" aria-label="Application status"><option>Not applied</option><option>Interview</option></SelectField>);
    assert.ok(html.includes('aria-label="Application status"'));
    assert.ok(html.includes('>Interview</span>'));
});
