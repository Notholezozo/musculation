import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForgeApi, apiErrorMessage } from '../../core/forge-api';
import { MUSCLE_GROUPS, formatDay, formatNumber, muscleGroup } from '../../core/format';
import { Exercise, ExerciseProgress, ProgressPoint } from '../../core/models';
import { ChartPoint, LineChart } from '../../shared/ui/line-chart';

type Metric = 'maxWeight' | 'oneRepMax' | 'volume';

interface MetricInfo {
  value: Metric;
  label: string;
  title: string;
  read: (point: ProgressPoint) => number;
  detail: (point: ProgressPoint) => string;
}

const METRICS: MetricInfo[] = [
  {
    value: 'maxWeight',
    label: 'Charge max',
    title: 'Charge la plus lourde de chaque séance',
    read: (p) => p.maxWeightKg,
    detail: (p) => `${p.repsAtMaxWeight} reps`,
  },
  {
    value: 'oneRepMax',
    label: '1RM estimé',
    title: 'Charge maximale estimée sur une répétition',
    read: (p) => p.estimatedOneRepMaxKg,
    detail: (p) => `meilleure série de la séance`,
  },
  {
    value: 'volume',
    label: 'Volume',
    title: 'Volume de chaque séance (répétitions × charge)',
    read: (p) => p.volumeKg,
    detail: (p) => `${p.setCount} séries · ${p.totalReps} reps`,
  },
];

/** La progression d'un exercice : une courbe par mesure, les chiffres clés et l'historique. */
@Component({
  selector: 'app-progress',
  imports: [RouterLink, LineChart],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">Progression</p>
          <h1>{{ progress()?.exerciseName ?? 'Ma progression' }}</h1>
        </div>
        @if (exercises().length > 0) {
          <label class="field picker">
            <span class="field__label">Exercice</span>
            <select class="input" (change)="choose($any($event.target).value)">
              @for (group of grouped(); track group.label) {
                <optgroup [label]="group.label">
                  @for (exercise of group.exercises; track exercise.id) {
                    <option [value]="exercise.id" [selected]="exercise.id === selectedId()">
                      {{ exercise.name }}
                    </option>
                  }
                </optgroup>
              }
            </select>
          </label>
        }
      </header>

      @if (error(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      @if (loading()) {
        <p class="muted">Chargement…</p>
      } @else if (exercises().length === 0) {
        <div class="empty">
          <p class="empty__title">Aucun exercice à suivre</p>
          <p>Crée tes exercices, enregistre des séances : leur progression s'affichera ici.</p>
          <a class="btn" routerLink="/exercices">Créer un exercice</a>
        </div>
      } @else if (progress(); as data) {
        @if (data.points.length === 0) {
          <div class="empty">
            <p class="empty__title">Pas encore de séance avec « {{ data.exerciseName }} »</p>
            <p>Ajoute cet exercice à une séance pour commencer à tracer sa courbe.</p>
            <a class="btn" routerLink="/seances/nouvelle">Créer une séance</a>
          </div>
        } @else {
          <div class="stats">
            <div class="stat">
              <p class="stat__label">Record de charge</p>
              <p class="stat__value">{{ number(summary().record.maxWeightKg) }}<span class="stat__unit">kg</span></p>
              <p class="stat__note">
                {{ summary().record.repsAtMaxWeight }} reps · {{ day(summary().record.date) }}
              </p>
            </div>
            <div class="stat">
              <p class="stat__label">Meilleur 1RM estimé</p>
              <p class="stat__value">
                {{ number(summary().bestOneRm.estimatedOneRepMaxKg) }}<span class="stat__unit">kg</span>
              </p>
              <p class="stat__note">{{ day(summary().bestOneRm.date) }}</p>
            </div>
            <div class="stat">
              <p class="stat__label">Séances</p>
              <p class="stat__value">{{ data.points.length }}</p>
              <p class="stat__note">depuis le {{ day(data.points[0].date) }}</p>
            </div>
            <div class="stat">
              <p class="stat__label">Évolution · {{ metric().label }}</p>
              <p class="stat__value">
                {{ summary().delta >= 0 ? '+' : '−' }}{{ number(abs(summary().delta)) }}<span class="stat__unit"
                  >kg</span
                >
              </p>
              <p class="stat__note">entre la première et la dernière séance</p>
            </div>
          </div>

          <section class="card">
            <div class="card__title chart-head">
              <div>
                <h2>{{ metric().label }}</h2>
                <p class="muted chart-head__sub">{{ metric().title }}, en kg</p>
              </div>
              <div class="segmented" role="group" aria-label="Mesure affichée">
                @for (option of metrics; track option.value) {
                  <button
                    class="segmented__option"
                    type="button"
                    [attr.aria-pressed]="option.value === metric().value"
                    (click)="metricKey.set(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            <app-line-chart
              [points]="chartPoints()"
              unit="kg"
              [label]="metric().title + ' pour ' + data.exerciseName"
            />
            @if (data.points.length === 1) {
              <p class="muted chart-note">Une seule séance pour l'instant : la courbe se dessinera dès la suivante.</p>
            }
          </section>

          <section class="card">
            <div class="card__title"><h2>Historique</h2></div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Séance</th>
                    <th class="num">Charge max</th>
                    <th class="num">1RM estimé</th>
                    <th class="num">Volume</th>
                    <th class="num">Séries</th>
                  </tr>
                </thead>
                <tbody>
                  @for (point of history(); track point.workoutId) {
                    <tr>
                      <td>
                        <a [routerLink]="['/seances', point.workoutId]">{{ day(point.date) }}</a>
                      </td>
                      <td class="num">{{ number(point.maxWeightKg) }} kg × {{ point.repsAtMaxWeight }}</td>
                      <td class="num">{{ number(point.estimatedOneRepMaxKg) }} kg</td>
                      <td class="num">{{ number(point.volumeKg) }} kg</td>
                      <td class="num">{{ point.setCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .picker {
      flex: 0 1 280px;
    }

    .chart-head {
      flex-wrap: wrap;
      align-items: start;
    }

    .chart-head__sub {
      font-size: var(--text-sm);
      margin-top: var(--space-1);
    }

    .chart-note {
      font-size: var(--text-sm);
      margin-top: var(--space-2);
    }
  `,
})
export class Progress {
  private readonly api = inject(ForgeApi);
  private readonly router = inject(Router);

  protected readonly metrics = METRICS;
  protected readonly day = formatDay;
  protected readonly number = formatNumber;
  protected readonly abs = Math.abs;

  protected readonly exercises = signal<Exercise[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly progress = signal<ExerciseProgress | null>(null);
  protected readonly metricKey = signal<Metric>('maxWeight');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private requestId = 0;

  protected readonly metric = computed(() => METRICS.find((m) => m.value === this.metricKey()) ?? METRICS[0]);

  protected readonly grouped = computed(() =>
    MUSCLE_GROUPS.map((group) => ({
      label: muscleGroup(group.value).label,
      exercises: this.exercises().filter((e) => e.muscleGroup === group.value),
    })).filter((group) => group.exercises.length > 0),
  );

  protected readonly chartPoints = computed<ChartPoint[]>(() => {
    const metric = this.metric();
    return (this.progress()?.points ?? []).map((p) => ({
      date: p.date,
      value: metric.read(p),
      detail: metric.detail(p),
    }));
  });

  /** Du plus récent au plus ancien. */
  protected readonly history = computed(() => [...(this.progress()?.points ?? [])].reverse());

  /** Chiffres clés ; n'est lu que lorsqu'il y a au moins un point. */
  protected readonly summary = computed(() => {
    const points = this.progress()?.points ?? [];
    const read = this.metric().read;
    const best = (score: (p: ProgressPoint) => number) =>
      points.reduce((top, p) => (score(p) > score(top) ? p : top), points[0]);
    return {
      record: best((p) => p.maxWeightKg * 1000 + p.repsAtMaxWeight),
      bestOneRm: best((p) => p.estimatedOneRepMaxKg),
      delta: points.length > 0 ? read(points[points.length - 1]) - read(points[0]) : 0,
    };
  });

  constructor() {
    void this.load(inject(ActivatedRoute).snapshot.queryParamMap.get('exercice'));
  }

  private async load(requestedId: string | null): Promise<void> {
    try {
      const exercises = await this.api.listExercises();
      this.exercises.set(exercises);
      // À défaut de choix : l'exercice pratiqué le plus récemment.
      const fallback = [...exercises].sort((a, b) =>
        (b.lastPerformedOn ?? '').localeCompare(a.lastPerformedOn ?? ''),
      )[0];
      const initial = exercises.find((e) => e.id === requestedId) ?? fallback;
      if (initial) await this.show(initial.id);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected choose(id: string): void {
    void this.show(id);
    void this.router.navigate([], { queryParams: { exercice: id }, replaceUrl: true });
  }

  private async show(id: string): Promise<void> {
    const request = ++this.requestId;
    this.selectedId.set(id);
    try {
      const progress = await this.api.exerciseProgress(id);
      if (request !== this.requestId) return;
      this.progress.set(progress);
      this.error.set(null);
    } catch (error) {
      if (request === this.requestId) this.error.set(apiErrorMessage(error));
    }
  }
}
