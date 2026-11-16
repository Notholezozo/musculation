import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForgeApi, apiErrorMessage } from '../../core/forge-api';
import {
  MUSCLE_GROUPS,
  formatDay,
  formatLongDay,
  formatNumber,
  formatSets,
  isIsoDay,
  muscleGroup,
  parseNumber,
  todayIso,
} from '../../core/format';
import { Exercise, LastPerformance, MuscleGroup, SaveWorkout } from '../../core/models';

interface DraftSet {
  reps: number | null;
  weightKg: number | null;
}

interface DraftEntry {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: DraftSet[];
  /** Le passage précédent sur cet exercice, rappelé sous le titre. */
  last: LastPerformance | null;
}

/** Création et modification d'une séance : jour, exercices, et pour chacun ses séries (répétitions, charge). */
@Component({
  selector: 'app-workout-editor',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">{{ dayLabel() }}</p>
          <h1>{{ workoutId ? 'Modifier la séance' : 'Nouvelle séance' }}</h1>
        </div>
        <a class="btn btn--quiet" routerLink="/" [queryParams]="{ jour: date() }">‹ Retour au journal</a>
      </header>

      @if (loading()) {
        <p class="muted">Chargement…</p>
      } @else if (loadError()) {
        <p class="alert" role="alert">{{ loadError() }}</p>
      } @else {
        <section class="card form-grid" aria-label="Informations de la séance">
          <label class="field">
            <span class="field__label">Jour</span>
            <input class="input" type="date" [value]="date()" (change)="setDate($event)" />
          </label>
          <label class="field">
            <span class="field__label">Nom de la séance</span>
            <input
              class="input"
              type="text"
              maxlength="80"
              placeholder="Push, Jambes, Haut du corps…"
              [value]="name()"
              (input)="name.set(text($event))"
            />
          </label>
          <label class="field form-grid__wide">
            <span class="field__label">Notes (facultatif)</span>
            <textarea
              class="input"
              maxlength="1000"
              placeholder="Forme du jour, sensations…"
              [value]="notes()"
              (input)="notes.set(text($event))"
            ></textarea>
          </label>
        </section>

        @for (entry of entries(); track entry.exerciseId; let i = $index) {
          <section class="card entry">
            <div class="entry__head">
              <div>
                <h2>{{ entry.exerciseName }}</h2>
                <span class="muscle" [style.--plate]="muscle(entry.muscleGroup).plate">
                  <span class="muscle__dot"></span>{{ muscle(entry.muscleGroup).label }}
                </span>
              </div>
              <div class="row">
                <button
                  class="btn btn--icon btn--sm"
                  type="button"
                  [disabled]="i === 0"
                  (click)="moveEntry(i, -1)"
                  [attr.aria-label]="'Monter ' + entry.exerciseName"
                >
                  ↑
                </button>
                <button
                  class="btn btn--icon btn--sm"
                  type="button"
                  [disabled]="i === entries().length - 1"
                  (click)="moveEntry(i, 1)"
                  [attr.aria-label]="'Descendre ' + entry.exerciseName"
                >
                  ↓
                </button>
                <button class="btn btn--danger btn--sm" type="button" (click)="removeEntry(i)">Retirer</button>
              </div>
            </div>

            @if (entry.last; as last) {
              <p class="entry__last">
                <span class="badge">Dernière fois</span>
                {{ day(last.date) }} — {{ sets(last.sets) }}
              </p>
            }

            <div class="sets" role="group" [attr.aria-label]="'Séries de ' + entry.exerciseName">
              <div class="sets__row sets__row--head" aria-hidden="true">
                <span>Série</span>
                <span>Répétitions</span>
                <span>Charge (kg)</span>
                <span></span>
              </div>
              @for (set of entry.sets; track $index; let j = $index) {
                <div class="sets__row">
                  <span class="sets__index num">{{ j + 1 }}</span>
                  <input
                    class="input input--num"
                    type="text"
                    inputmode="numeric"
                    [value]="display(set.reps)"
                    (change)="setReps(i, j, $event)"
                    [attr.aria-label]="'Série ' + (j + 1) + ' : répétitions'"
                  />
                  <input
                    class="input input--num"
                    type="text"
                    inputmode="decimal"
                    placeholder="0"
                    [value]="display(set.weightKg)"
                    (change)="setWeight(i, j, $event)"
                    [attr.aria-label]="'Série ' + (j + 1) + ' : charge en kilos'"
                  />
                  <button
                    class="btn btn--quiet btn--icon btn--sm"
                    type="button"
                    [disabled]="entry.sets.length === 1"
                    (click)="removeSet(i, j)"
                    [attr.aria-label]="'Supprimer la série ' + (j + 1)"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>

            <button class="btn btn--sm" type="button" (click)="addSet(i)">+ Ajouter une série</button>
          </section>
        }

        <section class="card stack" aria-label="Ajouter un exercice">
          <h2>Ajouter un exercice</h2>

          @if (available().length > 0) {
            <div class="picker">
              <label class="field">
                <span class="field__label">Exercice de mon catalogue</span>
                <select class="input" #picker>
                  @for (group of available(); track group.label) {
                    <optgroup [label]="group.label">
                      @for (exercise of group.exercises; track exercise.id) {
                        <option [value]="exercise.id">{{ exercise.name }}</option>
                      }
                    </optgroup>
                  }
                </select>
              </label>
              <button class="btn" type="button" (click)="addExercise(picker.value)">Ajouter</button>
            </div>
          } @else if (exercises().length > 0) {
            <p class="muted">Tous tes exercices sont déjà dans cette séance.</p>
          } @else {
            <p class="muted">Ton catalogue est vide : crée ton premier exercice ci-dessous.</p>
          }

          <details class="create" [open]="exercises().length === 0">
            <summary>Créer un nouvel exercice</summary>
            <div class="picker">
              <label class="field">
                <span class="field__label">Nom</span>
                <input class="input" type="text" maxlength="80" placeholder="Développé couché" #newName />
              </label>
              <label class="field">
                <span class="field__label">Groupe musculaire</span>
                <select class="input" #newGroup>
                  @for (group of groups; track group.value) {
                    <option [value]="group.value">{{ group.label }}</option>
                  }
                </select>
              </label>
              <button
                class="btn"
                type="button"
                [disabled]="creating()"
                (click)="createExercise(newName, newGroup.value)"
              >
                Créer et ajouter
              </button>
            </div>
          </details>
        </section>

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        <footer class="actions">
          <p class="actions__total num">
            {{ totals().sets }} série{{ totals().sets > 1 ? 's' : '' }} ·
            <strong>{{ number(totals().volume) }} kg</strong> de volume
          </p>
          @if (workoutId) {
            <button class="btn btn--danger" type="button" [disabled]="saving()" (click)="remove()">Supprimer</button>
          }
          <button class="btn btn--primary" type="button" [disabled]="saving()" (click)="save()">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer la séance' }}
          </button>
        </footer>
      }
    </div>
  `,
  styles: `
    @use 'tokens' as *;

    .entry {
      display: grid;
      gap: var(--space-4);
    }

    .entry__head {
      display: flex;
      flex-wrap: wrap;
      align-items: start;
      justify-content: space-between;
      gap: var(--space-3);

      h2 {
        margin-bottom: var(--space-1);
      }
    }

    .entry__last {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--ink-muted);
    }

    .sets {
      display: grid;
      gap: var(--space-2);
    }

    .sets__row {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr) minmax(0, 1fr) 36px;
      align-items: center;
      gap: var(--space-2);
      max-width: 460px;
    }

    .sets__row--head {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--ink-faint);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sets__index {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--text-lg);
      color: var(--ink-muted);
      text-align: center;
    }

    .picker {
      display: grid;
      gap: var(--space-3);
      align-items: end;

      @media (min-width: 640px) {
        grid-template-columns: repeat(auto-fit, minmax(0, 1fr));

        .btn {
          justify-self: start;
        }
      }
    }

    .create {
      border-top: 1px solid var(--line);
      padding-top: var(--space-3);

      summary {
        min-height: var(--tap-min);
        display: flex;
        align-items: center;
        color: var(--accent);
        font-weight: 500;
        cursor: pointer;
      }

      .picker {
        margin-top: var(--space-2);
      }
    }

    // La barre d'actions reste visible pendant la saisie des séries.
    .actions {
      position: sticky;
      bottom: calc(var(--nav-bar) + env(safe-area-inset-bottom) + var(--space-2));
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: var(--surface-300);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-raised);

      @media (min-width: $desktop) {
        bottom: var(--space-4);
      }
    }

    .actions__total {
      margin-right: auto;
      color: var(--ink-muted);

      strong {
        color: var(--ink);
      }
    }
  `,
})
export class WorkoutEditor {
  private readonly api = inject(ForgeApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly workoutId = this.route.snapshot.paramMap.get('id');
  protected readonly groups = MUSCLE_GROUPS;
  protected readonly muscle = muscleGroup;
  protected readonly day = formatDay;
  protected readonly sets = formatSets;
  protected readonly number = formatNumber;

  protected readonly date = signal(todayIso());
  protected readonly name = signal('');
  protected readonly notes = signal('');
  protected readonly entries = signal<DraftEntry[]>([]);
  protected readonly exercises = signal<Exercise[]>([]);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly creating = signal(false);

  protected readonly dayLabel = computed(() => formatLongDay(this.date()));

  /** Les exercices du catalogue qui ne sont pas encore dans la séance, rangés par groupe musculaire. */
  protected readonly available = computed(() => {
    const used = new Set(this.entries().map((e) => e.exerciseId));
    return MUSCLE_GROUPS.map((group) => ({
      label: group.label,
      exercises: this.exercises().filter((e) => e.muscleGroup === group.value && !used.has(e.id)),
    })).filter((group) => group.exercises.length > 0);
  });

  protected readonly totals = computed(() => {
    const sets = this.entries().flatMap((e) => e.sets);
    return {
      sets: sets.length,
      volume: sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0),
    };
  });

  constructor() {
    const requested = this.route.snapshot.queryParamMap.get('jour');
    if (isIsoDay(requested)) this.date.set(requested);
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [exercises, workout] = await Promise.all([
        this.api.listExercises(),
        this.workoutId ? this.api.getWorkout(this.workoutId) : null,
      ]);
      this.exercises.set(exercises);

      if (workout) {
        this.date.set(workout.date);
        this.name.set(workout.name);
        this.notes.set(workout.notes ?? '');
        this.entries.set(
          workout.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            muscleGroup: e.muscleGroup,
            sets: e.sets.map((s) => ({ ...s })),
            last: null,
          })),
        );
        // Le rappel du passage précédent arrive ensuite, sans bloquer l'affichage.
        for (const entry of workout.exercises) {
          void this.loadLast(entry.exerciseId);
        }
      }
    } catch (error) {
      this.loadError.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadLast(exerciseId: string): Promise<LastPerformance | null> {
    try {
      const last = await this.api.lastPerformance(exerciseId, this.date());
      this.entries.update((entries) => entries.map((e) => (e.exerciseId === exerciseId ? { ...e, last } : e)));
      return last;
    } catch {
      return null; // un rappel manquant n'empêche pas de saisir la séance
    }
  }

  // ——— Informations de la séance ———

  protected text(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected setDate(event: Event): void {
    const value = this.text(event);
    if (!isIsoDay(value)) return;
    this.date.set(value);
    for (const entry of this.entries()) {
      void this.loadLast(entry.exerciseId);
    }
  }

  // ——— Exercices ———

  /** Ajoute l'exercice, prérempli avec les séries de son dernier passage s'il y en a un. */
  protected async addExercise(exerciseId: string): Promise<void> {
    const exercise = this.exercises().find((e) => e.id === exerciseId);
    if (!exercise || this.entries().some((e) => e.exerciseId === exerciseId)) return;

    this.entries.update((entries) => [
      ...entries,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: [{ reps: null, weightKg: null }],
        last: null,
      },
    ]);

    const last = await this.loadLast(exerciseId);
    if (!last) return;
    this.entries.update((entries) =>
      entries.map((e) => {
        const untouched = e.sets.length === 1 && e.sets[0].reps === null && e.sets[0].weightKg === null;
        return e.exerciseId === exerciseId && untouched ? { ...e, sets: last.sets.map((s) => ({ ...s })) } : e;
      }),
    );
  }

  protected async createExercise(nameInput: HTMLInputElement, group: string): Promise<void> {
    const name = nameInput.value.trim();
    if (!name) {
      this.error.set("Donne un nom à l'exercice.");
      return;
    }

    this.creating.set(true);
    try {
      const exercise = await this.api.createExercise({ name, muscleGroup: group as MuscleGroup, notes: null });
      this.exercises.update((list) => [...list, exercise]);
      nameInput.value = '';
      this.error.set(null);
      await this.addExercise(exercise.id);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.creating.set(false);
    }
  }

  protected removeEntry(index: number): void {
    this.entries.update((entries) => entries.filter((_, i) => i !== index));
  }

  protected moveEntry(index: number, delta: number): void {
    this.entries.update((entries) => {
      const next = [...entries];
      const [moved] = next.splice(index, 1);
      next.splice(index + delta, 0, moved);
      return next;
    });
  }

  // ——— Séries ———

  protected display(value: number | null): string {
    return value === null ? '' : String(value).replace('.', ',');
  }

  /** Une nouvelle série reprend les valeurs de la précédente : c'est le cas le plus courant. */
  protected addSet(entryIndex: number): void {
    this.updateSets(entryIndex, (sets) => [...sets, { ...sets[sets.length - 1] }]);
  }

  protected removeSet(entryIndex: number, setIndex: number): void {
    this.updateSets(entryIndex, (sets) => sets.filter((_, i) => i !== setIndex));
  }

  protected setReps(entryIndex: number, setIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsed = parseNumber(input.value);
    const reps = parsed === null || parsed < 1 ? null : Math.round(parsed);
    input.value = this.display(reps);
    this.updateSets(entryIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, reps } : s)));
  }

  protected setWeight(entryIndex: number, setIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const weightKg = parseNumber(input.value);
    input.value = this.display(weightKg);
    this.updateSets(entryIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, weightKg } : s)));
  }

  private updateSets(entryIndex: number, change: (sets: DraftSet[]) => DraftSet[]): void {
    this.entries.update((entries) =>
      entries.map((e, i) => (i === entryIndex ? { ...e, sets: change(e.sets) } : e)),
    );
  }

  // ——— Enregistrement ———

  protected async save(): Promise<void> {
    const incomplete = this.entries().find((e) => e.sets.some((s) => s.reps === null));
    if (incomplete) {
      this.error.set(`« ${incomplete.exerciseName} » : indique le nombre de répétitions de chaque série.`);
      return;
    }

    const body: SaveWorkout = {
      date: this.date(),
      name: this.name().trim() || null,
      notes: this.notes().trim() || null,
      exercises: this.entries().map((e) => ({
        exerciseId: e.exerciseId,
        // Une charge laissée vide vaut 0 : exercice au poids du corps.
        sets: e.sets.map((s) => ({ reps: s.reps ?? 0, weightKg: s.weightKg ?? 0 })),
      })),
    };

    this.saving.set(true);
    try {
      await (this.workoutId ? this.api.updateWorkout(this.workoutId, body) : this.api.createWorkout(body));
      await this.backToJournal();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    if (!this.workoutId || !confirm('Supprimer définitivement cette séance ?')) return;

    this.saving.set(true);
    try {
      await this.api.deleteWorkout(this.workoutId);
      await this.backToJournal();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.saving.set(false);
    }
  }

  private backToJournal(): Promise<boolean> {
    return this.router.navigate(['/'], { queryParams: { jour: this.date() } });
  }
}
