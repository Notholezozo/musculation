using Forge.Application;
using Forge.Domain;

namespace Forge.Tests;

public class StrengthTests
{
    [Theory]
    [InlineData(100, 1, 100)]
    [InlineData(100, 10, 133.3)]
    [InlineData(60, 5, 70)]
    [InlineData(0, 12, 0)]
    [InlineData(80, 0, 0)]
    public void EstimateOneRepMax_suit_la_formule_d_Epley(double weight, int reps, double expected) =>
        Assert.Equal(expected, Strength.EstimateOneRepMax(weight, reps));

    [Fact]
    public void L_IMC_demande_la_taille_et_le_poids()
    {
        Assert.Null(new Profile { HeightCm = 180 }.Bmi);
        Assert.Equal(24.7, new Profile { HeightCm = 180, WeightKg = 80 }.Bmi);
    }
}

public class ProgressTests
{
    private static readonly Exercise Bench = new() { Name = "Développé couché", MuscleGroup = MuscleGroup.Chest };
    private static readonly Exercise Squat = new() { Name = "Squat", MuscleGroup = MuscleGroup.Legs };

    private static WorkoutExercise Entry(Exercise exercise, string date, params (int Reps, double Kg)[] sets)
    {
        var workout = new Workout { Date = DateOnly.Parse(date), Name = "Séance" };
        var entry = new WorkoutExercise
        {
            Workout = workout, WorkoutId = workout.Id, Exercise = exercise, ExerciseId = exercise.Id,
        };
        entry.Sets.AddRange(sets.Select((s, i) => new WorkoutSet { Position = i, Reps = s.Reps, WeightKg = s.Kg }));
        workout.Exercises.Add(entry);
        return entry;
    }

    [Fact]
    public void Un_point_par_seance_du_plus_ancien_au_plus_recent()
    {
        var points = Progress.BuildPoints(
        [
            Entry(Bench, "2026-11-10", (8, 70), (6, 75)),
            Entry(Bench, "2026-11-03", (10, 60), (10, 60), (8, 65)),
        ]);

        Assert.Equal([DateOnly.Parse("2026-11-03"), DateOnly.Parse("2026-11-10")], points.Select(p => p.Date));

        var first = points[0];
        Assert.Equal(65, first.MaxWeightKg);
        Assert.Equal(8, first.RepsAtMaxWeight);
        Assert.Equal(10 * 60 + 10 * 60 + 8 * 65, first.VolumeKg);
        Assert.Equal(28, first.TotalReps);
        Assert.Equal(3, first.SetCount);
        Assert.Equal(82.3, first.EstimatedOneRepMaxKg); // 65 × (1 + 8/30)
    }

    [Fact]
    public void Un_passage_sans_serie_ne_donne_aucun_point() =>
        Assert.Empty(Progress.BuildPoints([Entry(Bench, "2026-11-03")]));

    [Fact]
    public void Le_record_garde_la_charge_la_plus_lourde_et_sa_premiere_date()
    {
        var records = Progress.BuildRecords(
        [
            Entry(Squat, "2026-10-01", (5, 100)),
            Entry(Bench, "2026-10-02", (5, 80)),
            Entry(Bench, "2026-10-09", (3, 85), (12, 70)),
            Entry(Bench, "2026-10-16", (3, 85)),
        ]);

        Assert.Equal(["Développé couché", "Squat"], records.Select(r => r.ExerciseName));

        var bench = records[0];
        Assert.Equal(85, bench.MaxWeightKg);
        Assert.Equal(3, bench.RepsAtMaxWeight);
        Assert.Equal(DateOnly.Parse("2026-10-09"), bench.MaxWeightDate);
        Assert.Equal(98, bench.BestEstimatedOneRepMaxKg); // 70 × (1 + 12/30)
        Assert.Equal(3, bench.WorkoutCount);
    }
}
