using Forge.Domain;
using Microsoft.Extensions.DependencyInjection;

namespace Forge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ExerciseService>();
        services.AddScoped<WorkoutService>();
        services.AddScoped<ProfileService>();
        return services;
    }
}

internal static class Text
{
    public static string? Clean(string? value, int maxLength, string label)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > maxLength)
            throw new RuleViolationException($"{label} : {maxLength} caractères au maximum.");
        return trimmed;
    }
}

public sealed class ExerciseService(IExerciseRepository exercises, IWorkoutRepository workouts, IUnitOfWork unitOfWork)
{
    public async Task<List<ExerciseDto>> ListAsync(CancellationToken ct)
    {
        var usage = (await workouts.ListEntriesAsync(null, ct))
            .GroupBy(e => e.ExerciseId)
            .ToDictionary(
                g => g.Key,
                g => (Count: g.Select(e => e.WorkoutId).Distinct().Count(), Last: g.Max(e => e.Workout.Date)));

        return (await exercises.ListAsync(ct))
            .OrderBy(e => e.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(e => usage.TryGetValue(e.Id, out var u)
                ? ToDto(e, u.Count, u.Last)
                : ToDto(e, 0, null))
            .ToList();
    }

    public async Task<ExerciseDto> CreateAsync(SaveExerciseRequest request, CancellationToken ct)
    {
        var exercise = new Exercise { CreatedAtUtc = DateTime.UtcNow };
        await ApplyAsync(exercise, request, ct);
        exercises.Add(exercise);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(exercise, 0, null);
    }

    public async Task<ExerciseDto> UpdateAsync(Guid id, SaveExerciseRequest request, CancellationToken ct)
    {
        var exercise = await FindAsync(id, ct);
        await ApplyAsync(exercise, request, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var entries = await workouts.ListEntriesAsync(id, ct);
        return ToDto(
            exercise,
            entries.Select(e => e.WorkoutId).Distinct().Count(),
            entries.Count == 0 ? null : entries.Max(e => e.Workout.Date));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var exercise = await FindAsync(id, ct);
        var used = (await workouts.ListEntriesAsync(id, ct)).Select(e => e.WorkoutId).Distinct().Count();
        if (used > 0)
        {
            throw new ConflictException(
                $"« {exercise.Name} » figure dans {used} séance(s) : retire-le de ces séances avant de le supprimer.");
        }

        exercises.Remove(exercise);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<ExerciseProgressDto> GetProgressAsync(Guid id, CancellationToken ct)
    {
        var exercise = await FindAsync(id, ct);
        var points = Progress.BuildPoints(await workouts.ListEntriesAsync(id, ct));
        return new ExerciseProgressDto(exercise.Id, exercise.Name, exercise.MuscleGroup, points);
    }

    /// <summary>Les séries du dernier passage sur cet exercice, pour préremplir une nouvelle séance. Nul s'il n'y en a pas.</summary>
    public async Task<LastPerformanceDto?> GetLastPerformanceAsync(Guid id, DateOnly? before, CancellationToken ct)
    {
        await FindAsync(id, ct);
        var last = (await workouts.ListEntriesAsync(id, ct))
            .Where(e => e.Sets.Count > 0 && (before is null || e.Workout.Date < before))
            .OrderByDescending(e => e.Workout.Date).ThenByDescending(e => e.Workout.CreatedAtUtc)
            .FirstOrDefault();

        return last is null
            ? null
            : new LastPerformanceDto(
                last.WorkoutId, last.Workout.Date,
                last.OrderedSets.Select(s => new SetDto(s.Reps, s.WeightKg)).ToList());
    }

    private async Task<Exercise> FindAsync(Guid id, CancellationToken ct) =>
        await exercises.GetAsync(id, ct) ?? throw new NotFoundException("Exercice introuvable.");

    private async Task ApplyAsync(Exercise exercise, SaveExerciseRequest request, CancellationToken ct)
    {
        var name = Text.Clean(request.Name, Exercise.NameMaxLength, "Nom de l'exercice")
            ?? throw new RuleViolationException("Donne un nom à l'exercice.");
        if (!Enum.IsDefined(request.MuscleGroup))
            throw new RuleViolationException("Groupe musculaire inconnu.");

        var duplicate = (await exercises.ListAsync(ct))
            .Any(e => e.Id != exercise.Id && string.Equals(e.Name, name, StringComparison.CurrentCultureIgnoreCase));
        if (duplicate)
            throw new ConflictException($"Un exercice « {name} » existe déjà.");

        exercise.Name = name;
        exercise.MuscleGroup = request.MuscleGroup;
        exercise.Notes = Text.Clean(request.Notes, Exercise.NotesMaxLength, "Notes");
    }

    private static ExerciseDto ToDto(Exercise e, int workoutCount, DateOnly? last) =>
        new(e.Id, e.Name, e.MuscleGroup, e.Notes, workoutCount, last);
}

public sealed class WorkoutService(IWorkoutRepository workouts, IExerciseRepository exercises, IUnitOfWork unitOfWork)
{
    public const string DefaultName = "Séance";

    public async Task<List<WorkoutSummaryDto>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken ct) =>
        (await workouts.ListAsync(from, to, ct))
            .OrderBy(w => w.Date).ThenBy(w => w.CreatedAtUtc)
            .Select(w =>
            {
                var ordered = w.Exercises.OrderBy(e => e.Position).ToList();
                return new WorkoutSummaryDto(
                    w.Id, w.Date, w.Name, ordered.Count, w.SetCount, Math.Round(w.VolumeKg, 1),
                    ordered.Select(e => e.Exercise.Name).Distinct().ToList(),
                    ordered.Select(e => e.Exercise.MuscleGroup).Distinct().ToList());
            })
            .ToList();

    public async Task<WorkoutDto> GetAsync(Guid id, CancellationToken ct) => ToDto(await FindAsync(id, ct));

    public async Task<WorkoutDto> CreateAsync(SaveWorkoutRequest request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var workout = new Workout { CreatedAtUtc = now, UpdatedAtUtc = now };
        await ApplyAsync(workout, request, ct);
        workouts.Add(workout);
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(workout);
    }

    public async Task<WorkoutDto> UpdateAsync(Guid id, SaveWorkoutRequest request, CancellationToken ct)
    {
        var workout = await FindAsync(id, ct);
        await ApplyAsync(workout, request, ct);
        workout.UpdatedAtUtc = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(workout);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        workouts.Remove(await FindAsync(id, ct));
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<Workout> FindAsync(Guid id, CancellationToken ct) =>
        await workouts.GetAsync(id, ct) ?? throw new NotFoundException("Séance introuvable.");

    /// <summary>Valide toute la demande, puis remplace le contenu de la séance.</summary>
    private async Task ApplyAsync(Workout workout, SaveWorkoutRequest request, CancellationToken ct)
    {
        if (request.Date == default)
            throw new RuleViolationException("Choisis le jour de la séance.");

        var name = Text.Clean(request.Name, Workout.NameMaxLength, "Nom de la séance") ?? DefaultName;
        var notes = Text.Clean(request.Notes, Workout.NotesMaxLength, "Notes");
        var catalog = (await exercises.ListAsync(ct)).ToDictionary(e => e.Id);

        var entries = new List<WorkoutExercise>();
        foreach (var item in request.Exercises ?? [])
        {
            if (!catalog.TryGetValue(item.ExerciseId, out var exercise))
                throw new RuleViolationException("Un exercice de la séance n'existe plus dans ton catalogue.");
            if (item.Sets is not { Count: > 0 })
                throw new RuleViolationException($"« {exercise.Name} » : ajoute au moins une série.");

            var entry = new WorkoutExercise { Exercise = exercise, ExerciseId = exercise.Id, Position = entries.Count };
            foreach (var set in item.Sets)
            {
                if (set.Reps is < 1 or > WorkoutSet.MaxReps)
                    throw new RuleViolationException(
                        $"« {exercise.Name} » : les répétitions vont de 1 à {WorkoutSet.MaxReps}.");
                if (double.IsNaN(set.WeightKg) || set.WeightKg is < 0 or > WorkoutSet.MaxWeightKg)
                    throw new RuleViolationException(
                        $"« {exercise.Name} » : la charge va de 0 à {WorkoutSet.MaxWeightKg} kg.");

                entry.Sets.Add(new WorkoutSet
                {
                    Position = entry.Sets.Count,
                    Reps = set.Reps,
                    WeightKg = Math.Round(set.WeightKg, 2),
                });
            }

            entries.Add(entry);
        }

        workout.Date = request.Date;
        workout.Name = name;
        workout.Notes = notes;
        workout.Exercises.Clear();
        workout.Exercises.AddRange(entries);
    }

    private static WorkoutDto ToDto(Workout w) =>
        new(
            w.Id, w.Date, w.Name, w.Notes,
            w.Exercises.OrderBy(e => e.Position)
                .Select(e => new WorkoutExerciseDto(
                    e.ExerciseId, e.Exercise.Name, e.Exercise.MuscleGroup,
                    e.OrderedSets.Select(s => new SetDto(s.Reps, s.WeightKg)).ToList()))
                .ToList(),
            w.SetCount,
            Math.Round(w.VolumeKg, 1));
}

public sealed class ProfileService(IProfileRepository profiles, IWorkoutRepository workouts, IUnitOfWork unitOfWork)
{
    public async Task<ProfileDto> GetAsync(CancellationToken ct) =>
        await ToDtoAsync(await profiles.GetOrCreateAsync(ct), ct);

    public async Task<ProfileDto> UpdateAsync(SaveProfileRequest request, CancellationToken ct)
    {
        if (request.HeightCm is < 50 or > 260)
            throw new RuleViolationException("La taille va de 50 à 260 cm.");
        if (request.WeightKg is < 20 or > 400)
            throw new RuleViolationException("Le poids va de 20 à 400 kg.");

        var profile = await profiles.GetOrCreateAsync(ct);
        profile.Name = Text.Clean(request.Name, Profile.NameMaxLength, "Prénom");
        profile.HeightCm = request.HeightCm;
        profile.WeightKg = request.WeightKg;
        profile.UpdatedAtUtc = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        return await ToDtoAsync(profile, ct);
    }

    public async Task<List<PersonalRecordDto>> GetRecordsAsync(CancellationToken ct) =>
        Progress.BuildRecords(await workouts.ListEntriesAsync(null, ct));

    private async Task<ProfileDto> ToDtoAsync(Profile profile, CancellationToken ct)
    {
        var all = await workouts.ListAsync(null, null, ct);
        return new ProfileDto(
            profile.Name, profile.HeightCm, profile.WeightKg, profile.Bmi,
            all.Count,
            all.Sum(w => w.SetCount),
            Math.Round(all.Sum(w => w.VolumeKg), 1),
            all.Count == 0 ? null : all.Min(w => w.Date));
    }
}
