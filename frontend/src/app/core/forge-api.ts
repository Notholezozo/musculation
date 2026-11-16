import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Exercise,
  ExerciseProgress,
  LastPerformance,
  PersonalRecord,
  Profile,
  SaveExercise,
  SaveProfile,
  SaveWorkout,
  Workout,
  WorkoutSummary,
} from './models';

@Injectable({ providedIn: 'root' })
export class ForgeApi {
  private readonly http = inject(HttpClient);

  listExercises(): Promise<Exercise[]> {
    return firstValueFrom(this.http.get<Exercise[]>('/api/exercises'));
  }

  createExercise(body: SaveExercise): Promise<Exercise> {
    return firstValueFrom(this.http.post<Exercise>('/api/exercises', body));
  }

  updateExercise(id: string, body: SaveExercise): Promise<Exercise> {
    return firstValueFrom(this.http.put<Exercise>(`/api/exercises/${id}`, body));
  }

  deleteExercise(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/exercises/${id}`));
  }

  exerciseProgress(id: string): Promise<ExerciseProgress> {
    return firstValueFrom(this.http.get<ExerciseProgress>(`/api/exercises/${id}/progress`));
  }

  /** Dernier passage sur l'exercice avant le jour donné ; `null` s'il n'y en a pas (réponse 204). */
  lastPerformance(id: string, before: string): Promise<LastPerformance | null> {
    return firstValueFrom(
      this.http.get<LastPerformance | null>(`/api/exercises/${id}/last`, { params: { before } }),
    );
  }

  listWorkouts(from: string, to: string): Promise<WorkoutSummary[]> {
    return firstValueFrom(this.http.get<WorkoutSummary[]>('/api/workouts', { params: { from, to } }));
  }

  getWorkout(id: string): Promise<Workout> {
    return firstValueFrom(this.http.get<Workout>(`/api/workouts/${id}`));
  }

  createWorkout(body: SaveWorkout): Promise<Workout> {
    return firstValueFrom(this.http.post<Workout>('/api/workouts', body));
  }

  updateWorkout(id: string, body: SaveWorkout): Promise<Workout> {
    return firstValueFrom(this.http.put<Workout>(`/api/workouts/${id}`, body));
  }

  deleteWorkout(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/workouts/${id}`));
  }

  getProfile(): Promise<Profile> {
    return firstValueFrom(this.http.get<Profile>('/api/profile'));
  }

  updateProfile(body: SaveProfile): Promise<Profile> {
    return firstValueFrom(this.http.put<Profile>('/api/profile', body));
  }

  listRecords(): Promise<PersonalRecord[]> {
    return firstValueFrom(this.http.get<PersonalRecord[]>('/api/profile/records'));
  }
}

/** Le message à montrer pour une erreur d'API : le titre du « problem details », sinon un message générique. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0 || error.status >= 502) {
      return "Le serveur ne répond pas. Vérifie que l'API est démarrée.";
    }
    const title = (error.error as { title?: unknown } | null)?.title;
    if (typeof title === 'string' && error.status < 500) {
      return title;
    }
  }
  return 'Une erreur est survenue. Réessaie.';
}
