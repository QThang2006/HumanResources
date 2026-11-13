// Keep calendar deadlines at the end of the selected Vietnam day, independent
// of the server timezone and without fractional seconds rounded by MySQL.
export function parseTrainingDueDate(value: string): Date {
    if (typeof value !== 'string') return new Date(NaN);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const calendar = new Date(`${value}T00:00:00.000Z`);
        if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== value) {
            return new Date(NaN);
        }
        return new Date(`${value}T23:59:59+07:00`);
    }
    return new Date(value);
}
