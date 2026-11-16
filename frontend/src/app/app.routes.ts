import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Séances — Forge',
    loadComponent: () => import('./features/journal/journal').then((m) => m.Journal),
  },
  {
    path: 'seances/nouvelle',
    title: 'Nouvelle séance — Forge',
    loadComponent: () => import('./features/workout-editor/workout-editor').then((m) => m.WorkoutEditor),
  },
  {
    path: 'seances/:id',
    title: 'Séance — Forge',
    loadComponent: () => import('./features/workout-editor/workout-editor').then((m) => m.WorkoutEditor),
  },
  {
    path: 'exercices',
    title: 'Exercices — Forge',
    loadComponent: () => import('./features/exercises/exercises').then((m) => m.Exercises),
  },
  {
    path: 'progression',
    title: 'Progression — Forge',
    loadComponent: () => import('./features/progress/progress').then((m) => m.Progress),
  },
  {
    path: 'profil',
    title: 'Profil — Forge',
    loadComponent: () => import('./features/profile/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'design-system',
    title: 'Design system — Forge',
    loadComponent: () => import('./features/design-system/design-system').then((m) => m.DesignSystem),
  },
  { path: '**', redirectTo: '' },
];
