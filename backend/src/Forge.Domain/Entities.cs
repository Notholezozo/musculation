namespace Forge.Domain;

/// <summary>Groupe musculaire principal d'un exercice. Sert au classement et à la couleur dans l'interface.</summary>
public enum MuscleGroup
{
    Chest,
    Back,
    Shoulders,
    Biceps,
    Triceps,
    Legs,
    Glutes,
    Abs,
    Cardio,
    Other,
}

/// <summary>Un exercice du catalogue personnel (« Développé couché », « Squat »…).</summary>
public class Exercise
{
    public const int NameMaxLength = 80;
    public const int NotesMaxLength = 500;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public MuscleGroup MuscleGroup { get; set; } = MuscleGroup.Other;
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

/// <summary>Une séance, rattachée à un jour. Plusieurs séances peuvent avoir lieu le même jour.</summary>
public class Workout
{
    public const int NameMaxLength = 80;
    public const int NotesMaxLength = 1000;

    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public List<WorkoutExercise> Exercises { get; set; } = [];

    public int SetCount => Exercises.Sum(e => e.Sets.Count);
    public double VolumeKg => Exercises.Sum(e => e.VolumeKg);
}

/// <summary>Un exercice réalisé dans une séance, avec ses séries.</summary>
public class WorkoutExercise
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkoutId { get; set; }
    public Workout Workout { get; set; } = null!;
    public Guid ExerciseId { get; set; }
    public Exercise Exercise { get; set; } = null!;
    public int Position { get; set; }

    public List<WorkoutSet> Sets { get; set; } = [];

    public IEnumerable<WorkoutSet> OrderedSets => Sets.OrderBy(s => s.Position);

    /// <summary>Volume : somme des répétitions × charge.</summary>
    public double VolumeKg => Sets.Sum(s => s.Reps * s.WeightKg);

    public int TotalReps => Sets.Sum(s => s.Reps);

    /// <summary>La meilleure série : la plus lourde, puis celle qui compte le plus de répétitions.</summary>
    public WorkoutSet? HeaviestSet =>
        Sets.OrderByDescending(s => s.WeightKg).ThenByDescending(s => s.Reps).FirstOrDefault();

    public double BestEstimatedOneRepMaxKg =>
        Sets.Count == 0 ? 0 : Sets.Max(s => Strength.EstimateOneRepMax(s.WeightKg, s.Reps));
}

/// <summary>Une série : un nombre de répétitions à une charge donnée (0 kg = poids du corps).</summary>
public class WorkoutSet
{
    public const int MaxReps = 500;
    public const double MaxWeightKg = 1000;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkoutExerciseId { get; set; }
    public int Position { get; set; }
    public int Reps { get; set; }
    public double WeightKg { get; set; }
}

/// <summary>Le profil de l'unique utilisateur de l'application.</summary>
public class Profile
{
    public const int SingletonId = 1;
    public const int NameMaxLength = 60;

    public int Id { get; set; } = SingletonId;
    public string? Name { get; set; }
    public double? HeightCm { get; set; }
    public double? WeightKg { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    /// <summary>Indice de masse corporelle, si la taille et le poids sont renseignés.</summary>
    public double? Bmi
    {
        get
        {
            if (HeightCm is not > 0 || WeightKg is not > 0) return null;
            var meters = HeightCm.Value / 100;
            return Math.Round(WeightKg.Value / (meters * meters), 1);
        }
    }
}
