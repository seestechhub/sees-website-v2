// The editorial calendar always uses Lagos (UTC+01:00, no daylight saving).
export function fromLagosInput(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
        throw new Error('Invalid Lagos date');
    return new Date(`${value}:00+01:00`).toISOString();
}
export function toLagosInput(value: string) {
    return new Date(new Date(value).getTime() + 3600000).toISOString().slice(0, 16);
}
