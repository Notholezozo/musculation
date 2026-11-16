import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForgeApi, apiErrorMessage } from '../../core/forge-api';
import { MUSCLE_GROUPS, formatDay } from '../../core/format';
import { Exercise, MuscleGroup } from '../../core/models';

/** Le catalogue personnel : créer, modifier et supprimer ses exercices. */
@Component({
  selector: 'app-exercises',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">Catalogue</p>
          <h1>Mes exercices</h1>
        </div>
        <p class="page__lead">Crée ici les exercices que tu ajouteras ensuite à tes séances.</p>
      </header>

      <form class="card stack" (submit)="submit($event)">
        <h2>{{ editing() ? 'Modifier « ' + editing()!.name + ' »' : 'Créer un exercice' }}</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Nom</span>
            <input
              class="input"
              type="text"
              maxlength="80"
              placeholder="Développé couché"
              [value]="name()"
              (input)="name.set(text($event))"
            />
          </label>
          <label class="field">
            <span class="field__label">Groupe musculaire</span>
            <select class="input" (change)="group.set($any(text($event)))">
              @for (option of groups; track option.value) {
                <option [value]="option.value" [selected]="option.value === group()">{{ option.label }}</option>
              }
            </select>
          </label>
          <label class="field form-grid__wide">
            <span class="field__label">Notes (facultatif)</span>
            <input
              class="input"
              type="text"
              maxlength="500"
              placeholder="Réglage de la machine, prise, consigne…"
              [value]="notes()"
              (input)="notes.set(text($event))"
            />
          </label>
        </div>

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        <div class="row">
          <button class="btn btn--primary" type="submit" [disabled]="saving()">
            {{ editing() ? 'Enregistrer' : "Créer l'exercice" }}
          </button>
          @if (editing()) {
            <button class="btn btn--quiet" type="button" (click)="reset()">Annuler</button>
          }
        </div>
      </form>

      @if (loading()) {
        <p class="muted">Chargement…</p>
      } @else if (exercises().length === 0) {
        <div class="empty">
          <p class="empty__title">Aucun exercice pour l'instant</p>
          <p>Commence par ceux de ta prochaine séance : squat, développé couché, tractions…</p>
        </div>
      } @else {
        @for (section of sections(); track section.label) {
          <section class="card">
            <div class="card__title">
              <h2 class="section-title" [style.--plate]="section.plate">
                <span class="muscle__dot"></span>{{ section.label }}
              </h2>
              <span class="badge num">{{ section.exercises.length }}</span>
            </div>
            <ul class="list">
              @for (exercise of section.exercises; track exercise.id) {
                <li class="item">
                  <div class="item__main">
                    <p class="item__name">{{ exercise.name }}</p>
                    <p class="item__meta">
                      @if (exercise.lastPerformedOn; as last) {
                        {{ exercise.workoutCount }} séance{{ exercise.workoutCount > 1 ? 's' : '' }} · dernière le
                        {{ day(last) }}
                      } @else {
                        Jamais réalisé
                      }
                      @if (exercise.notes) {
                        — {{ exercise.notes }}
                      }
                    </p>
                  </div>
                  <div class="row">
                    @if (exercise.workoutCount > 0) {
                      <a class="btn btn--sm" routerLink="/progression" [queryParams]="{ exercice: exercise.id }">
                        Progression
                      </a>
                    }
                    <button class="btn btn--sm" type="button" (click)="edit(exercise)">Modifier</button>
                    <button class="btn btn--danger btn--sm" type="button" (click)="remove(exercise)">Supprimer</button>
                  </div>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .section-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2) var(--space-4);
      padding: var(--space-3) 0;
      border-top: 1px solid var(--line);

      &:last-child {
        padding-bottom: 0;
      }
    }

    .item__main {
      min-width: 0;
      flex: 1 1 220px;
    }

    .item__name {
      font-weight: 600;
    }

    .item__meta {
      font-size: var(--text-sm);
      color: var(--ink-muted);
    }
  `,
})
export class Exercises {
  private readonly api = inject(ForgeApi);

  protected readonly groups = MUSCLE_GROUPS;
  protected readonly day = formatDay;

  protected readonly exercises = signal<Exercise[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly editing = signal<Exercise | null>(null);
  protected readonly name = signal('');
  protected readonly group = signal<MuscleGroup>('Chest');
  protected readonly notes = signal('');

  protected readonly sections = computed(() =>
    MUSCLE_GROUPS.map((group) => ({
      label: group.label,
      plate: group.plate,
      exercises: this.exercises().filter((e) => e.muscleGroup === group.value),
    })).filter((section) => section.exercises.length > 0),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.exercises.set(await this.api.listExercises());
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected edit(exercise: Exercise): void {
    this.editing.set(exercise);
    this.name.set(exercise.name);
    this.group.set(exercise.muscleGroup);
    this.notes.set(exercise.notes ?? '');
    this.error.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected reset(): void {
    this.editing.set(null);
    this.name.set('');
    this.notes.set('');
    this.error.set(null);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.name().trim();
    if (!name) {
      this.error.set("Donne un nom à l'exercice.");
      return;
    }

    const body = { name, muscleGroup: this.group(), notes: this.notes().trim() || null };
    const editing = this.editing();
    this.saving.set(true);
    try {
      await (editing ? this.api.updateExercise(editing.id, body) : this.api.createExercise(body));
      this.reset();
      await this.load();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(exercise: Exercise): Promise<void> {
    if (!confirm(`Supprimer « ${exercise.name} » de ton catalogue ?`)) return;
    try {
      await this.api.deleteExercise(exercise.id);
      if (this.editing()?.id === exercise.id) this.reset();
      this.error.set(null);
      await this.load();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
