using Forge.Domain;

namespace Forge.Application;

public interface IExerciseRepository
{
    Task<List<Exercise>> ListAsync(CancellationToken ct);
    Task<Exercise?> GetAsync(Guid id, CancellationToken ct);
    void Add(Exercise exercise);
    void Remove(Exercise exercise);
}

public interface IWorkoutRepository
{
    /// <summary>Séances entre deux jours inclus (bornes facultatives), avec exercices et séries.</summary>
    Task<List<Workout>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken ct);

    Task<Workout?> GetAsync(Guid id, CancellationToken ct);

    /// <summary>Passages d'exercices avec leur séance, leur exercice et leurs séries ; tous si <paramref name="exerciseId"/> est nul.</summary>
    Task<List<WorkoutExercise>> ListEntriesAsync(Guid? exerciseId, CancellationToken ct);

    void Add(Workout workout);
    void Remove(Workout workout);
}

public interface IProfileRepository
{
    Task<Profile> GetOrCreateAsync(CancellationToken ct);
}

public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct);
}

/// <summary>La ressource demandée n'existe pas (404).</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>L'opération contredit l'état actuel des données (409).</summary>
public sealed class ConflictException(string message) : Exception(message);

/// <summary>La demande ne respecte pas une règle de saisie (400).</summary>
public sealed class RuleViolationException(string message) : Exception(message);
