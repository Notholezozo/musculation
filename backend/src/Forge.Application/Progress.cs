using Forge.Domain;

namespace Forge.Application;

/// <summary>Calculs de progression, purs : ils ne lisent que les passages qu'on leur donne.</summary>
public static class Progress
{
    /// <summary>Un point par séance, du plus ancien au plus récent. Les passages sans série sont ignorés.</summary>
    public static List<ProgressPointDto> BuildPoints(IEnumerable<WorkoutExercise> entries) =>
        entries
            .Where(e => e.Sets.Count > 0)
            .GroupBy(e => e.Workout)
            .OrderBy(g => g.Key.Date).ThenBy(g => g.Key.CreatedAtUtc)
            .Select(g =>
            {
                var sets = g.SelectMany(e => e.Sets).ToList();
                var heaviest = sets.OrderByDescending(s => s.WeightKg).ThenByDescending(s => s.Reps).First();
                return new ProgressPointDto(
                    g.Key.Id,
                    g.Key.Date,
                    heaviest.WeightKg,
                    heaviest.Reps,
                    sets.Max(s => Strength.EstimateOneRepMax(s.WeightKg, s.Reps)),
                    Math.Round(sets.Sum(s => s.Reps * s.WeightKg), 1),
                    sets.Sum(s => s.Reps),
                    sets.Count);
            })
            .ToList();

    /// <summary>
    /// Le record de chaque exercice : la charge la plus lourde (à égalité, le plus de répétitions, puis la date
    /// la plus ancienne) et le meilleur 1RM estimé. Triés par nom d'exercice.
    /// </summary>
    public static List<PersonalRecordDto> BuildRecords(IEnumerable<WorkoutExercise> entries) =>
        entries
            .Where(e => e.Sets.Count > 0)
            .GroupBy(e => e.Exercise)
            .Select(g =>
            {
                var points = BuildPoints(g);
                var heaviest = points
                    .OrderByDescending(p => p.MaxWeightKg).ThenByDescending(p => p.RepsAtMaxWeight).ThenBy(p => p.Date)
                    .First();
                var bestOneRm = points.OrderByDescending(p => p.EstimatedOneRepMaxKg).ThenBy(p => p.Date).First();
                return new PersonalRecordDto(
                    g.Key.Id, g.Key.Name, g.Key.MuscleGroup,
                    heaviest.MaxWeightKg, heaviest.RepsAtMaxWeight, heaviest.Date,
                    bestOneRm.EstimatedOneRepMaxKg, bestOneRm.Date,
                    points.Count);
            })
            .OrderBy(r => r.ExerciseName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
}
