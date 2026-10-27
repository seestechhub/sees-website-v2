import * as React from 'react';
import { cn } from '@/lib/utils';
// shadcn/ui Input, styled with the site's semantic CSS tokens.
export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return <input type={type} data-slot="input" className={cn('ui-input', className)} {...props}/>;
}
