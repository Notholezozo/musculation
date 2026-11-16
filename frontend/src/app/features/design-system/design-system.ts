import { Component, signal } from '@angular/core';
import { MUSCLE_GROUPS } from '../../core/format';
import { ChartPoint, LineChart } from '../../shared/ui/line-chart';

interface Swatch {
  token: string;
  role: string;
}

/** La vitrine du design system « Forge » : chaque jeton et chaque composant, rendus avec les vraies classes. */
@Component({
  selector: 'app-design-system',
  imports: [LineChart],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <p class="page__eyebrow">Design system</p>
          <h1>Forge — thème « fonte »</h1>
        </div>
        <p class="page__lead">
          Fonte sombre, craie et braise. Les jetons sont dans <code>styles/_tokens.scss</code>, les classes communes
          dans <code>styles.scss</code> ; aucun composant ne code une couleur en dur.
        </p>
      </header>

      <section class="card stack">
        <h2>Surfaces, texte et accent</h2>
        <div class="swatches">
          @for (swatch of colors; track swatch.token) {
            <div class="swatch">
              <span class="swatch__chip" [style.background]="'var(' + swatch.token + ')'"></span>
              <code>{{ swatch.token }}</code>
              <span class="muted">{{ swatch.role }}</span>
            </div>
          }
        </div>
      </section>

      <section class="card stack">
        <h2>Disques — groupes musculaires</h2>
        <p class="muted">
          Chaque groupe garde sa couleur de disque partout (calendrier, listes, séances). La couleur n'est jamais
          seule : une pastille accompagne toujours le libellé.
        </p>
        <div class="row">
          @for (group of groups; track group.value) {
            <span class="muscle" [style.--plate]="group.plate"><span class="muscle__dot"></span>{{ group.label }}</span>
          }
        </div>
      </section>

      <section class="card stack">
        <h2>Typographie</h2>
        <div class="type">
          <p class="type__display">82,5 kg × 8</p>
          <p class="muted">Barlow Condensed 700 — titres, chiffres clés, boutons</p>
          <h1>Titre de page</h1>
          <h2>Titre de section</h2>
          <h3>Titre de carte</h3>
          <p>Barlow 400 — texte courant. Les chiffres comparés entre eux s'alignent en colonnes (classe <code>.num</code>).</p>
          <p class="muted">Texte secondaire, en <code>--ink-muted</code>.</p>
        </div>
      </section>

      <section class="card stack">
        <h2>Boutons</h2>
        <div class="row">
          <button class="btn btn--primary" type="button">Enregistrer</button>
          <button class="btn" type="button">Ajouter</button>
          <button class="btn btn--quiet" type="button">Annuler</button>
          <button class="btn btn--danger" type="button">Supprimer</button>
          <button class="btn btn--primary" type="button" disabled>Désactivé</button>
        </div>
        <div class="row">
          <button class="btn btn--sm" type="button">Petit</button>
          <button class="btn btn--icon btn--sm" type="button" aria-label="Précédent">‹</button>
          <button class="btn btn--icon" type="button" aria-label="Fermer">✕</button>
        </div>
      </section>

      <section class="card stack">
        <h2>Champs</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Champ texte</span>
            <input class="input" type="text" placeholder="Développé couché" />
          </label>
          <label class="field">
            <span class="field__label">Liste</span>
            <select class="input">
              @for (group of groups; track group.value) {
                <option>{{ group.label }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">Champ numérique (<code>.input--num</code>)</span>
            <input class="input input--num" type="text" inputmode="decimal" value="62,5" />
          </label>
          <div class="field">
            <span class="field__label">Sélecteur segmenté</span>
            <div class="segmented" role="group" aria-label="Exemple de sélecteur">
              @for (option of options; track option) {
                <button
                  class="segmented__option"
                  type="button"
                  [attr.aria-pressed]="option === option$()"
                  (click)="option$.set(option)"
                >
                  {{ option }}
                </button>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="card stack">
        <h2>Badges, tuiles et messages</h2>
        <div class="row">
          <span class="badge">Dernière fois</span>
          <span class="badge badge--accent">Record</span>
          <span class="badge num">1 240 kg</span>
        </div>
        <div class="stats">
          <div class="stat">
            <p class="stat__label">Record de charge</p>
            <p class="stat__value">85<span class="stat__unit">kg</span></p>
            <p class="stat__note">3 reps · 9 oct.</p>
          </div>
          <div class="stat">
            <p class="stat__label">Séances</p>
            <p class="stat__value">24</p>
          </div>
        </div>
        <p class="alert" role="presentation">Message d'erreur : ce qui s'est passé et comment le corriger.</p>
        <p class="alert alert--success" role="presentation">Message de confirmation.</p>
        <div class="empty">
          <p class="empty__title">État vide</p>
          <p>Une phrase qui dit quoi faire ensuite.</p>
          <button class="btn" type="button">Action</button>
        </div>
      </section>

      <section class="card stack">
        <h2>Courbe de progression</h2>
        <p class="muted">
          Une seule série en braise, trait de 2 px, grille discrète ; au survol, un repère vertical et une infobulle.
        </p>
        <app-line-chart [points]="sample" unit="kg" label="Exemple de courbe de progression" />
      </section>

      <section class="card stack">
        <h2>Espacements et angles</h2>
        <div class="row scale">
          @for (space of spaces; track space) {
            <span class="scale__item">
              <span class="scale__bar" [style.width]="'var(--space-' + space + ')'"></span>
              <code>--space-{{ space }}</code>
            </span>
          }
        </div>
        <div class="row">
          @for (radius of radii; track radius) {
            <span class="radius" [style.border-radius]="'var(--radius-' + radius + ')'">
              <code>{{ radius }}</code>
            </span>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    code {
      font-size: var(--text-sm);
      color: var(--ink);
    }

    .swatches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: var(--space-3);
    }

    .swatch {
      display: grid;
      grid-template-columns: 40px 1fr;
      column-gap: var(--space-3);
      align-items: center;
      font-size: var(--text-sm);

      .muted {
        grid-column: 2;
      }
    }

    .swatch__chip {
      grid-row: span 2;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-control);
    }

    .type {
      display: grid;
      gap: var(--space-2);
    }

    .type__display {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--text-2xl);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .scale {
      align-items: end;
    }

    .scale__item {
      display: grid;
      gap: var(--space-1);
      justify-items: start;
    }

    .scale__bar {
      height: 16px;
      background: var(--accent-fill);
      border-radius: 2px;
    }

    .radius {
      display: grid;
      place-items: center;
      width: 72px;
      height: 56px;
      background: var(--surface-400);
      border: 1px solid var(--border-control);
    }
  `,
})
export class DesignSystem {
  protected readonly groups = MUSCLE_GROUPS;
  protected readonly options = ['Charge max', '1RM estimé', 'Volume'];
  protected readonly option$ = signal(this.options[0]);
  protected readonly spaces = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly radii = ['sm', 'md', 'lg', 'full'];

  protected readonly colors: Swatch[] = [
    { token: '--surface-100', role: 'Fond de page' },
    { token: '--surface-200', role: 'Cartes, panneaux' },
    { token: '--surface-300', role: 'Champs, survols' },
    { token: '--surface-400', role: 'Éléments actifs' },
    { token: '--ink', role: 'Texte' },
    { token: '--ink-muted', role: 'Texte secondaire' },
    { token: '--ink-faint', role: 'Repères discrets' },
    { token: '--accent', role: 'Braise : texte, trait' },
    { token: '--accent-fill', role: 'Braise : surface pleine' },
    { token: '--accent-soft', role: 'Élément sélectionné' },
    { token: '--line', role: 'Séparateurs' },
    { token: '--border-control', role: 'Bordure des champs' },
    { token: '--focus', role: 'Anneau de focus' },
    { token: '--success', role: 'Confirmation' },
    { token: '--danger', role: 'Erreur, suppression' },
  ];

  protected readonly sample: ChartPoint[] = [
    { date: '2026-09-02', value: 60, detail: '10 reps' },
    { date: '2026-09-09', value: 62.5, detail: '10 reps' },
    { date: '2026-09-18', value: 65, detail: '8 reps' },
    { date: '2026-09-25', value: 65, detail: '10 reps' },
    { date: '2026-10-06', value: 70, detail: '6 reps' },
    { date: '2026-10-14', value: 72.5, detail: '6 reps' },
    { date: '2026-10-27', value: 75, detail: '5 reps' },
    { date: '2026-11-05', value: 77.5, detail: '5 reps' },
  ];
}
