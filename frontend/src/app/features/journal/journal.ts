import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForgeApi, apiErrorMessage } from '../../core/forge-api';
import {
  formatLongDay,
  formatMonth,
  formatNumber,
  fromIsoDay,
  isIsoDay,
  muscleGroup,
  toIsoDay,
  todayIso,
} from '../../core/format';
import { WorkoutSummary } from '../../core/models';

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  workoutCount: number;
  /** Couleurs de disque des groupes travaillés ce jour-là (trois au plus). */
  plates: string[];
  label: string;
}

/** Le journal : un calendrier mensuel et, pour le jour choisi, ses séances. */
@Component({
  selector: 'app-journal',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">Journal</p>
          <h1>Mes séances</h1>
        </div>
        <a class="btn btn--primary" routerLink="/seances/nouvelle" [queryParams]="{ jour: selected() }">
          + Nouvelle séance
        </a>
      </header>

      @if (error(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      <div class="layout">
        <section class="card" aria-label="Calendrier">
          <div class="cal__head">
            <button class="btn btn--icon btn--sm" type="button" (click)="shiftMonth(-1)" aria-label="Mois précédent">
              ‹
            </button>
            <h2 class="cal__month" aria-live="polite">{{ monthLabel() }}</h2>
            <button class="btn btn--icon btn--sm" type="button" (click)="shiftMonth(1)" aria-label="Mois suivant">
              ›
            </button>
            <button class="btn btn--quiet btn--sm cal__today" type="button" (click)="goToToday()">Aujourd'hui</button>
          </div>

          <div class="cal__grid cal__grid--names" aria-hidden="true">
            @for (name of weekdays; track $index) {
              <span>{{ name }}</span>
            }
          </div>
          <div class="cal__grid">
            @for (cell of cells(); track cell.iso) {
              <button
                type="button"
                class="day"
                [class.day--out]="!cell.inMonth"
                [class.day--today]="cell.isToday"
                [attr.aria-pressed]="cell.iso === selected()"
                [attr.aria-label]="cell.label"
                (click)="select(cell.iso)"
              >
                <span class="day__num num">{{ cell.day }}</span>
                <span class="day__dots">
                  @for (plate of cell.plates; track $index) {
                    <span class="day__dot" [style.background]="plate"></span>
                  }
                </span>
              </button>
            }
          </div>

          <dl class="month-stats">
            <div>
              <dt>Séances du mois</dt>
              <dd class="num">{{ monthStats().workouts }}</dd>
            </div>
            <div>
              <dt>Séries</dt>
              <dd class="num">{{ monthStats().sets }}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd class="num">{{ number(monthStats().volume) }} <span>kg</span></dd>
            </div>
          </dl>
        </section>

        <section class="stack" aria-live="polite">
          <h2 class="day-title">{{ selectedLabel() }}</h2>

          @for (workout of dayWorkouts(); track workout.id) {
            <a class="card workout" [routerLink]="['/seances', workout.id]">
              <div class="workout__head">
                <h3>{{ workout.name }}</h3>
                <span class="badge num">{{ number(workout.volumeKg) }} kg</span>
              </div>
              <p class="muted">
                {{ workout.exerciseCount }} exercice{{ workout.exerciseCount > 1 ? 's' : '' }} ·
                {{ workout.setCount }} série{{ workout.setCount > 1 ? 's' : '' }}
              </p>
              @if (workout.exerciseNames.length > 0) {
                <p class="workout__names">{{ workout.exerciseNames.join(' · ') }}</p>
              }
              <div class="row">
                @for (group of workout.muscleGroups; track group) {
                  <span class="muscle" [style.--plate]="muscle(group).plate">
                    <span class="muscle__dot"></span>{{ muscle(group).label }}
                  </span>
                }
              </div>
            </a>
          } @empty {
            @if (!loading()) {
              <div class="empty">
                <p class="empty__title">Aucune séance ce jour-là</p>
                <p>Crée la séance, ajoute tes exercices, puis note tes séries.</p>
                <a class="btn" routerLink="/seances/nouvelle" [queryParams]="{ jour: selected() }">Créer la séance</a>
              </div>
            }
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    @use 'tokens' as *;

    .layout {
      display: grid;
      gap: var(--space-5);
      align-items: start;

      @media (min-width: $desktop) {
        grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
      }
    }

    .cal__head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }

    .cal__month {
      min-width: 9.5em;
      text-align: center;
    }

    .cal__today {
      margin-left: auto;
    }

    .cal__grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: var(--space-1);
    }

    .cal__grid--names {
      margin-bottom: var(--space-1);
      color: var(--ink-faint);
      font-size: var(--text-xs);
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
    }

    .day {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      aspect-ratio: 1;
      min-height: var(--tap-min);
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      background: var(--surface-300);
      cursor: pointer;

      &:hover {
        border-color: var(--border-control);
      }

      &[aria-pressed='true'] {
        background: var(--accent-soft);
        border-color: var(--accent-fill);
      }
    }

    .day--out {
      background: transparent;
      color: var(--ink-faint);
    }

    .day--today .day__num {
      color: var(--accent);
    }

    .day__num {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.125rem;
      line-height: 1;
    }

    .day__dots {
      display: flex;
      gap: 3px;
      height: 6px;
    }

    .day__dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
    }

    .month-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-3);
      margin: var(--space-4) 0 0;
      padding-top: var(--space-4);
      border-top: 1px solid var(--line);

      dt {
        font-size: var(--text-sm);
        color: var(--ink-muted);
      }

      dd {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: var(--text-xl);
        line-height: 1.15;

        span {
          font-size: var(--text-md);
          color: var(--ink-muted);
        }
      }
    }

    .day-title::first-letter {
      text-transform: uppercase;
    }

    .workout {
      display: grid;
      gap: var(--space-2);
      color: inherit;
      text-decoration: none;
      transition: border-color 120ms;

      &:hover {
        border-color: var(--accent-fill);
      }
    }

    .workout__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);

      h3 {
        font-size: var(--text-lg);
      }
    }

    .workout__names {
      font-size: var(--text-sm);
    }
  `,
})
export class Journal {
  private readonly api = inject(ForgeApi);
  private readonly router = inject(Router);

  protected readonly weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  protected readonly muscle = muscleGroup;
  protected readonly number = formatNumber;

  protected readonly selected = signal(todayIso());
  /** Premier jour du mois affiché. */
  protected readonly month = signal(new Date());
  protected readonly workouts = signal<WorkoutSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private requestId = 0;

  protected readonly monthLabel = computed(() => formatMonth(this.month()));
  protected readonly selectedLabel = computed(() => formatLongDay(this.selected()));
  protected readonly dayWorkouts = computed(() => this.workouts().filter((w) => w.date === this.selected()));

  /** Les semaines entières (du lundi au dimanche) qui couvrent le mois affiché. */
  protected readonly cells = computed<DayCell[]>(() => {
    const month = this.month();
    const today = todayIso();
    const byDay = new Map<string, WorkoutSummary[]>();
    for (const workout of this.workouts()) {
      byDay.set(workout.date, [...(byDay.get(workout.date) ?? []), workout]);
    }

    const cells: DayCell[] = [];
    const cursor = gridStart(month);
    const end = gridEnd(month);
    while (cursor <= end) {
      const iso = toIsoDay(cursor);
      const dayWorkouts = byDay.get(iso) ?? [];
      const groups = [...new Set(dayWorkouts.flatMap((w) => w.muscleGroups))];
      const count = dayWorkouts.length;
      cells.push({
        iso,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month.getMonth(),
        isToday: iso === today,
        workoutCount: count,
        plates: count > 0 && groups.length === 0 ? ['var(--plate-steel)'] : groups.slice(0, 3).map((g) => muscleGroup(g).plate),
        label: `${formatLongDay(iso)}, ${count === 0 ? 'aucune séance' : count === 1 ? '1 séance' : `${count} séances`}`,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
  });

  protected readonly monthStats = computed(() => {
    const month = this.month();
    const inMonth = this.workouts().filter((w) => {
      const date = fromIsoDay(w.date);
      return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
    });
    return {
      workouts: inMonth.length,
      sets: inMonth.reduce((sum, w) => sum + w.setCount, 0),
      volume: inMonth.reduce((sum, w) => sum + w.volumeKg, 0),
    };
  });

  constructor() {
    const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('jour');
    const day = isIsoDay(requested) ? requested : todayIso();
    this.selected.set(day);
    this.month.set(firstOfMonth(fromIsoDay(day)));
    void this.load();
  }

  protected select(iso: string): void {
    this.selected.set(iso);
    const date = fromIsoDay(iso);
    if (date.getMonth() !== this.month().getMonth()) {
      this.month.set(firstOfMonth(date));
      void this.load();
    }
    // Le jour reste dans l'adresse : on le retrouve en revenant d'une séance.
    void this.router.navigate([], { queryParams: { jour: iso }, replaceUrl: true });
  }

  protected shiftMonth(delta: number): void {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    void this.load();
  }

  protected goToToday(): void {
    this.select(todayIso());
  }

  private async load(): Promise<void> {
    const id = ++this.requestId;
    this.loading.set(true);
    try {
      const month = this.month();
      const workouts = await this.api.listWorkouts(toIsoDay(gridStart(month)), toIsoDay(gridEnd(month)));
      if (id !== this.requestId) return;
      this.workouts.set(workouts);
      this.error.set(null);
    } catch (error) {
      if (id !== this.requestId) return;
      this.error.set(apiErrorMessage(error));
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Le lundi de la semaine du 1er du mois. */
function gridStart(month: Date): Date {
  const start = firstOfMonth(month);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** Le dimanche de la semaine du dernier jour du mois. */
function gridEnd(month: Date): Date {
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  return end;
}
