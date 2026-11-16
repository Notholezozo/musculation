// Contrats de l'API (backend/src/Forge.Application/Contracts.cs). Les dates sont des jours « AAAA-MM-JJ ».

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Glutes'
  | 'Abs'
  | 'Cardio'
  | 'Other';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  notes: string | null;
  workoutCount: number;
  lastPerformedOn: string | null;
}

export interface SaveExercise {
  name: string;
  muscleGroup: MuscleGroup;
  notes: string | null;
}

export interface WorkoutSet {
  reps: number;
  weightKg: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  notes: string | null;
  exercises: WorkoutExercise[];
  setCount: number;
  volumeKg: number;
}

export interface WorkoutSummary {
  id: string;
  date: string;
  name: string;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  exerciseNames: string[];
  muscleGroups: MuscleGroup[];
}

export interface SaveWorkout {
  date: string;
  name: string | null;
  notes: string | null;
  exercises: { exerciseId: string; sets: WorkoutSet[] }[];
}

export interface ProgressPoint {
  workoutId: string;
  date: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  estimatedOneRepMaxKg: number;
  volumeKg: number;
  totalReps: number;
  setCount: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  points: ProgressPoint[];
}

export interface LastPerformance {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  maxWeightDate: string;
  bestEstimatedOneRepMaxKg: number;
  bestEstimatedOneRepMaxDate: string;
  workoutCount: number;
}

export interface Profile {
  name: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  workoutCount: number;
  setCount: number;
  totalVolumeKg: number;
  firstWorkoutOn: string | null;
}

export interface SaveProfile {
  name: string | null;
  heightCm: number | null;
  weightKg: number | null;
}
