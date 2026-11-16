namespace Forge.Domain;

public static class Strength
{
    /// <summary>
    /// Charge maximale estimée sur une répétition (1RM), formule d'Epley : charge × (1 + reps / 30).
    /// Une série d'une seule répétition vaut sa charge. Arrondi au dixième de kilo.
    /// </summary>
    public static double EstimateOneRepMax(double weightKg, int reps)
    {
        if (reps <= 0 || weightKg <= 0) return 0;
        if (reps == 1) return weightKg;
        return Math.Round(weightKg * (1 + reps / 30.0), 1);
    }
}
