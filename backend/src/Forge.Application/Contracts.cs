using Forge.Domain;

namespace Forge.Application;

// Exercices
public record ExerciseDto(
    Guid Id, string Name, MuscleGroup MuscleGroup, string? Notes, int WorkoutCount, DateOnly? LastPerformedOn);

public record SaveExerciseRequest(string Name, MuscleGroup MuscleGroup, string? Notes);

// Séances
public record SetDto(int Reps, double WeightKg);

public record WorkoutExerciseDto(
    Guid ExerciseId, string ExerciseName, MuscleGroup MuscleGroup, IReadOnlyList<SetDto> Sets);

public record WorkoutDto(
    Guid Id, DateOnly Date, string Name, string? Notes,
    IReadOnlyList<WorkoutExerciseDto> Exercises, int SetCount, double VolumeKg);

public record WorkoutSummaryDto(
    Guid Id, DateOnly Date, string Name, int ExerciseCount, int SetCount, double VolumeKg,
    IReadOnlyList<string> ExerciseNames, IReadOnlyList<MuscleGroup> MuscleGroups);

public record SaveWorkoutExerciseRequest(Guid ExerciseId, IReadOnlyList<SetDto> Sets);

public record SaveWorkoutRequest(
    DateOnly Date, string? Name, string? Notes, IReadOnlyList<SaveWorkoutExerciseRequest> Exercises);

// Progression
public record ProgressPointDto(
    Guid WorkoutId, DateOnly Date, double MaxWeightKg, int RepsAtMaxWeight,
    double EstimatedOneRepMaxKg, double VolumeKg, int TotalReps, int SetCount);

public record ExerciseProgressDto(
    Guid ExerciseId, string ExerciseName, MuscleGroup MuscleGroup, IReadOnlyList<ProgressPointDto> Points);

public record LastPerformanceDto(Guid WorkoutId, DateOnly Date, IReadOnlyList<SetDto> Sets);

public record PersonalRecordDto(
    Guid ExerciseId, string ExerciseName, MuscleGroup MuscleGroup,
    double MaxWeightKg, int RepsAtMaxWeight, DateOnly MaxWeightDate,
    double BestEstimatedOneRepMaxKg, DateOnly BestEstimatedOneRepMaxDate,
    int WorkoutCount);

// Profil
public record ProfileDto(
    string? Name, double? HeightCm, double? WeightKg, double? Bmi,
    int WorkoutCount, int SetCount, double TotalVolumeKg, DateOnly? FirstWorkoutOn);

public record SaveProfileRequest(string? Name, double? HeightCm, double? WeightKg);
