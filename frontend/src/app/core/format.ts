import { MuscleGroup, WorkoutSet } from './models';

// ——— Groupes musculaires : libellé et couleur de disque ———

export interface MuscleGroupInfo {
  value: MuscleGroup;
  label: string;
  /** Variable CSS de la couleur de disque associée. */
  plate: string;
}

/** Ordre fixe : la couleur suit le groupe, jamais sa position dans une liste. */
export const MUSCLE_GROUPS: readonly MuscleGroupInfo[] = [
  { value: 'Chest', label: 'Pectoraux', plate: 'var(--plate-red)' },
  { value: 'Back', label: 'Dos', plate: 'var(--plate-blue)' },
  { value: 'Shoulders', label: 'Épaules', plate: 'var(--plate-yellow)' },
  { value: 'Biceps', label: 'Biceps', plate: 'var(--plate-violet)' },
  { value: 'Triceps', label: 'Triceps', plate: 'var(--plate-pink)' },
  { value: 'Legs', label: 'Jambes', plate: 'var(--plate-green)' },
  { value: 'Glutes', label: 'Fessiers', plate: 'var(--plate-orange)' },
  { value: 'Abs', label: 'Abdominaux', plate: 'var(--plate-teal)' },
  { value: 'Cardio', label: 'Cardio', plate: 'var(--plate-white)' },
  { value: 'Other', label: 'Autre', plate: 'var(--plate-steel)' },
];

const BY_VALUE = new Map(MUSCLE_GROUPS.map((group) => [group.value, group]));

export function muscleGroup(value: MuscleGroup): MuscleGroupInfo {
  return BY_VALUE.get(value) ?? MUSCLE_GROUPS[MUSCLE_GROUPS.length - 1];
}

// ——— Jours « AAAA-MM-JJ », toujours en heure locale ———

export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(fromIsoDay(value).getTime());
}

export function todayIso(): string {
  return toIsoDay(new Date());
}

const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const FULL_DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** « dimanche 15 novembre » */
export function formatLongDay(iso: string): string {
  return LONG_DAY.format(fromIsoDay(iso));
}

/** « 15 nov. », avec l'année si elle n'est pas l'année en cours. */
export function formatDay(iso: string): string {
  const date = fromIsoDay(iso);
  return (date.getFullYear() === new Date().getFullYear() ? SHORT_DAY : FULL_DAY).format(date);
}

/** « novembre 2026 » */
export function formatMonth(date: Date): string {
  return MONTH.format(date);
}

// ——— Nombres ———

/** « 62,5 », « 1 240 » */
export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

/** Lit une saisie « 62,5 » ou « 62.5 ». `null` si ce n'est pas un nombre positif ou nul. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Une série en clair : « 10 × 60 kg », ou « 12 reps » au poids du corps. */
export function formatSet(set: WorkoutSet): string {
  return set.weightKg > 0 ? `${set.reps} × ${formatNumber(set.weightKg)} kg` : `${set.reps} reps`;
}

/** Un groupe de séries en clair : « 3 × 10 × 60 kg » si elles sont identiques, sinon la liste. */
export function formatSets(sets: WorkoutSet[]): string {
  if (sets.length === 0) return '';
  const [first] = sets;
  const identical = sets.every((s) => s.reps === first.reps && s.weightKg === first.weightKg);
  return identical && sets.length > 1
    ? `${sets.length} × ${formatSet(first)}`
    : sets.map(formatSet).join(' · ');
}
