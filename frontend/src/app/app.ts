import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  /** Tracé de l'icône, dans une grille de 24 × 24. */
  icon: string;
  exact: boolean;
}

/** Coque de l'application : rail de navigation sur grand écran, barre d'onglets sur téléphone. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" aria-label="Navigation principale">
      <a class="nav__brand" routerLink="/">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9v6M6.5 6v12M17.5 6v12M21 9v6M6.5 12h11" />
        </svg>
        Forge
      </a>

      <ul class="nav__list">
        @for (item of items; track item.path) {
          <li>
            <a
              class="nav__link"
              [routerLink]="item.path"
              routerLinkActive="nav__link--active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              ariaCurrentWhenActive="page"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>

      <a class="nav__foot" routerLink="/design-system" routerLinkActive="nav__foot--active">Design system</a>
    </nav>

    <main class="main">
      <router-outlet />
    </main>
  `,
  styles: `
    @use 'tokens' as *;

    :host {
      display: block;
      min-height: 100dvh;
    }

    svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex: none;
    }

    // Téléphone : barre d'onglets fixée en bas.
    .nav {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 10;
      height: calc(var(--nav-bar) + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--surface-200);
      border-top: 1px solid var(--line);
    }

    .nav__brand,
    .nav__foot {
      display: none;
    }

    .nav__list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      height: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .nav__link {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      height: 100%;
      color: var(--ink-muted);
      font-size: var(--text-xs);
      font-weight: 500;
      text-decoration: none;

      &:hover {
        color: var(--ink);
      }
    }

    .nav__link--active {
      color: var(--accent);
    }

    .main {
      padding-bottom: calc(var(--nav-bar) + env(safe-area-inset-bottom));
    }

    // Grand écran : rail à gauche.
    @media (min-width: $desktop) {
      .nav {
        inset: 0 auto 0 0;
        width: var(--nav-rail);
        height: auto;
        padding: var(--space-5) var(--space-3);
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
        border-top: 0;
        border-right: 1px solid var(--line);
      }

      .nav__brand {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: 0 var(--space-3);
        color: var(--ink);
        font-family: var(--font-display);
        font-weight: 700;
        font-size: var(--text-xl);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-decoration: none;

        svg {
          width: 28px;
          height: 28px;
          color: var(--accent);
        }
      }

      .nav__list {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-1);
        height: auto;
      }

      .nav__link {
        flex-direction: row;
        justify-content: flex-start;
        gap: var(--space-3);
        height: var(--tap-min);
        padding: 0 var(--space-3);
        border-radius: var(--radius-md);
        font-size: var(--text-md);

        &:hover {
          background: var(--surface-300);
        }
      }

      .nav__link--active {
        background: var(--accent-soft);
      }

      .nav__foot {
        display: block;
        margin-top: auto;
        padding: var(--space-2) var(--space-3);
        color: var(--ink-muted);
        font-size: var(--text-sm);
        text-decoration: none;

        &:hover,
        &.nav__foot--active {
          color: var(--ink);
        }
      }

      .main {
        padding-bottom: 0;
        margin-left: var(--nav-rail);
      }
    }
  `,
})
export class App {
  protected readonly items: NavItem[] = [
    {
      path: '/',
      label: 'Séances',
      icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
      exact: true,
    },
    {
      path: '/exercices',
      label: 'Exercices',
      icon: 'M3 9v6M6.5 6v12M17.5 6v12M21 9v6M6.5 12h11',
      exact: false,
    },
    {
      path: '/progression',
      label: 'Progression',
      icon: 'M4 20V4M4 20h16M8 15l4-5 3 3 5-7',
      exact: false,
    },
    {
      path: '/profil',
      label: 'Profil',
      icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
      exact: false,
    },
  ];
}
