import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForgeApi, apiErrorMessage } from '../../core/forge-api';
import { formatDay, formatNumber, muscleGroup, parseNumber } from '../../core/format';
import { PersonalRecord, Profile } from '../../core/models';

/** Le profil : taille, poids, chiffres d'ensemble et meilleures performances par exercice. */
@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">Profil</p>
          <h1>{{ profile()?.name || 'Mon profil' }}</h1>
        </div>
        <a class="btn btn--quiet ds-link" routerLink="/design-system">Design system</a>
      </header>

      @if (loading()) {
        <p class="muted">Chargement…</p>
      } @else if (profile(); as data) {
        <div class="stats">
          <div class="stat">
            <p class="stat__label">Taille</p>
            <p class="stat__value">
              @if (data.heightCm) {
                {{ number(data.heightCm) }}<span class="stat__unit">cm</span>
              } @else {
                —
              }
            </p>
          </div>
          <div class="stat">
            <p class="stat__label">Poids</p>
            <p class="stat__value">
              @if (data.weightKg) {
                {{ number(data.weightKg) }}<span class="stat__unit">kg</span>
              } @else {
                —
              }
            </p>
          </div>
          <div class="stat">
            <p class="stat__label">IMC</p>
            <p class="stat__value">{{ data.bmi ? number(data.bmi) : '—' }}</p>
            <p class="stat__note">{{ data.bmi ? 'poids ÷ taille²' : 'renseigne taille et poids' }}</p>
          </div>
          <div class="stat">
            <p class="stat__label">Séances</p>
            <p class="stat__value">{{ data.workoutCount }}</p>
            @if (data.firstWorkoutOn; as first) {
              <p class="stat__note">depuis le {{ day(first) }}</p>
            }
          </div>
          <div class="stat">
            <p class="stat__label">Volume total</p>
            <p class="stat__value">{{ volume().value }}<span class="stat__unit">{{ volume().unit }}</span></p>
            <p class="stat__note">{{ data.setCount }} séries</p>
          </div>
        </div>

        <form class="card stack" (submit)="save($event)">
          <h2>Mes informations</h2>
          <div class="form-grid form-grid--3">
            <label class="field">
              <span class="field__label">Prénom</span>
              <input class="input" type="text" maxlength="60" [value]="name()" (input)="name.set(text($event))" />
            </label>
            <label class="field">
              <span class="field__label">Taille (cm)</span>
              <input
                class="input"
                type="text"
                inputmode="decimal"
                placeholder="178"
                [value]="height()"
                (input)="height.set(text($event))"
              />
            </label>
            <label class="field">
              <span class="field__label">Poids (kg)</span>
              <input
                class="input"
                type="text"
                inputmode="decimal"
                placeholder="75,5"
                [value]="weight()"
                (input)="weight.set(text($event))"
              />
            </label>
          </div>

          @if (error(); as message) {
            <p class="alert" role="alert">{{ message }}</p>
          }
          @if (saved()) {
            <p class="alert alert--success" role="status">Profil enregistré.</p>
          }

          <div>
            <button class="btn btn--primary" type="submit" [disabled]="saving()">Enregistrer</button>
          </div>
        </form>

        <section class="card">
          <div class="card__title">
            <h2>Mes meilleures performances</h2>
            <span class="badge badge--accent num">{{ records().length }}</span>
          </div>

          @if (records().length === 0) {
            <p class="muted">Tes records apparaîtront ici dès ta première séance enregistrée.</p>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Exercice</th>
                    <th class="num">Record de charge</th>
                    <th>Date</th>
                    <th class="num">1RM estimé</th>
                    <th class="num">Séances</th>
                  </tr>
                </thead>
                <tbody>
                  @for (record of records(); track record.exerciseId) {
                    <tr>
                      <td>
                        <a routerLink="/progression" [queryParams]="{ exercice: record.exerciseId }">
                          {{ record.exerciseName }}
                        </a>
                        <span class="muscle record__group" [style.--plate]="muscle(record.muscleGroup).plate">
                          <span class="muscle__dot"></span>{{ muscle(record.muscleGroup).label }}
                        </span>
                      </td>
                      <td class="num record__best">
                        @if (record.maxWeightKg > 0) {
                          {{ number(record.maxWeightKg) }} kg × {{ record.repsAtMaxWeight }}
                        } @else {
                          {{ record.repsAtMaxWeight }} reps
                        }
                      </td>
                      <td>{{ day(record.maxWeightDate) }}</td>
                      <td class="num">
                        {{ record.bestEstimatedOneRepMaxKg > 0 ? number(record.bestEstimatedOneRepMaxKg) + ' kg' : '—' }}
                      </td>
                      <td class="num">{{ record.workoutCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else if (error()) {
        <p class="alert" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    @use 'tokens' as *;

    @media (min-width: 640px) {
      .form-grid--3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    // Sur grand écran, le lien vit déjà dans le rail de navigation.
    @media (min-width: $desktop) {
      .ds-link {
        display: none;
      }
    }

    .record__group {
      display: flex;
      margin-top: 2px;
      font-size: var(--text-xs);
    }

    .record__best {
      font-weight: 600;
    }
  `,
})
export class ProfilePage {
  private readonly api = inject(ForgeApi);

  protected readonly day = formatDay;
  protected readonly number = formatNumber;
  protected readonly muscle = muscleGroup;

  protected readonly profile = signal<Profile | null>(null);
  protected readonly records = signal<PersonalRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly height = signal('');
  protected readonly weight = signal('');

  /** Le volume total, en tonnes dès qu'il dépasse dix tonnes. */
  protected readonly volume = computed(() => {
    const kg = this.profile()?.totalVolumeKg ?? 0;
    return kg >= 10_000 ? { value: formatNumber(kg / 1000), unit: 't' } : { value: formatNumber(kg), unit: 'kg' };
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [profile, records] = await Promise.all([this.api.getProfile(), this.api.listRecords()]);
      this.apply(profile);
      this.records.set(records);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(profile: Profile): void {
    this.profile.set(profile);
    this.name.set(profile.name ?? '');
    this.height.set(profile.heightCm === null ? '' : String(profile.heightCm).replace('.', ','));
    this.weight.set(profile.weightKg === null ? '' : String(profile.weightKg).replace('.', ','));
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saved.set(false);

    const heightCm = parseNumber(this.height());
    const weightKg = parseNumber(this.weight());
    if (this.height().trim() !== '' && heightCm === null) {
      this.error.set('La taille doit être un nombre, en centimètres.');
      return;
    }
    if (this.weight().trim() !== '' && weightKg === null) {
      this.error.set('Le poids doit être un nombre, en kilos.');
      return;
    }

    this.saving.set(true);
    try {
      this.apply(await this.api.updateProfile({ name: this.name().trim() || null, heightCm, weightKg }));
      this.error.set(null);
      this.saved.set(true);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
