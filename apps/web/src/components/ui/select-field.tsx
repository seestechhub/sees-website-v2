'use client';
import { Children, isValidElement, useCallback, useState, type ReactNode, type ComponentProps } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './select';

type Props = {
    children: ReactNode;
    name?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    id?: string;
    'aria-label'?: string;
};
const EMPTY = '__sees_empty_option__';
// Adapter keeps existing server-rendered option lists and real HTML form values.
export function SelectField({ children, name, value, defaultValue, onValueChange, disabled, ...triggerProps }: Props) {
    const options = Children.toArray(children).filter(isValidElement).map(child => {
        const props = child.props as ComponentProps<'option'>;
        return { value: String(props.value ?? props.children ?? ''), label: props.children, disabled: props.disabled };
    });
    const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? '');
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const triggerRef = useCallback((node: HTMLButtonElement | null) => {
        if (node) setContainer(node.closest<HTMLElement>('.radar-page'));
    }, []);
    const selected = value ?? internalValue;
    return <>
        {name && <input type="hidden" name={name} value={selected} disabled={disabled}/>}
        <Select value={selected || EMPTY} disabled={disabled} onValueChange={next => {
            const actual = next === EMPTY ? '' : next;
            setInternalValue(actual);
            onValueChange?.(actual);
        }}>
            <SelectTrigger {...triggerProps} ref={triggerRef}><SelectValue>{options.find(option => option.value === selected)?.label}</SelectValue></SelectTrigger>
            <SelectContent portalContainer={container}>
                {options.map(option => <SelectItem key={option.value || EMPTY} value={option.value || EMPTY} disabled={option.disabled}>{option.label}</SelectItem>)}
            </SelectContent>
        </Select>
    </>;
}
