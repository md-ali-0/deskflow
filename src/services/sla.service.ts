export function calculateDueAt(createdAt: Date, slaHours: number): Date {
    const d = new Date(createdAt);
    d.setHours(d.getHours() + slaHours);
    return d;
}
