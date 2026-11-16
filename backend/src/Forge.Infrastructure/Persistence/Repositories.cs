using Forge.Application;
using Forge.Domain;
using Microsoft.EntityFrameworkCore;

namespace Forge.Infrastructure.Persistence;

public sealed class ExerciseRepository(ForgeDbContext db) : IExerciseRepository
{
    public Task<List<Exercise>> ListAsync(CancellationToken ct) => db.Exercises.ToListAsync(ct);

    public Task<Exercise?> GetAsync(Guid id, CancellationToken ct) =>
        db.Exercises.FirstOrDefaultAsync(e => e.Id == id, ct);

    public void Add(Exercise exercise) => db.Exercises.Add(exercise);

    public void Remove(Exercise exercise) => db.Exercises.Remove(exercise);
}

public sealed class WorkoutRepository(ForgeDbContext db) : IWorkoutRepository
{
    private IQueryable<Workout> WithContent =>
        db.Workouts
            .Include(w => w.Exercises).ThenInclude(e => e.Sets)
            .Include(w => w.Exercises).ThenInclude(e => e.Exercise)
            .AsSplitQuery();

    public Task<List<Workout>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var query = WithContent;
        if (from is not null) query = query.Where(w => w.Date >= from);
        if (to is not null) query = query.Where(w => w.Date <= to);
        return query.ToListAsync(ct);
    }

    public Task<Workout?> GetAsync(Guid id, CancellationToken ct) =>
        WithContent.FirstOrDefaultAsync(w => w.Id == id, ct);

    public Task<List<WorkoutExercise>> ListEntriesAsync(Guid? exerciseId, CancellationToken ct)
    {
        var query = db.WorkoutExercises
            .Include(e => e.Workout)
            .Include(e => e.Exercise)
            .Include(e => e.Sets)
            .AsSplitQuery();
        if (exerciseId is not null) query = query.Where(e => e.ExerciseId == exerciseId);
        return query.ToListAsync(ct);
    }

    public void Add(Workout workout) => db.Workouts.Add(workout);

    public void Remove(Workout workout) => db.Workouts.Remove(workout);
}

public sealed class ProfileRepository(ForgeDbContext db) : IProfileRepository
{
    public async Task<Profile> GetOrCreateAsync(CancellationToken ct)
    {
        var profile = await db.Profiles.FirstOrDefaultAsync(p => p.Id == Profile.SingletonId, ct);
        if (profile is null)
        {
            profile = new Profile { UpdatedAtUtc = DateTime.UtcNow };
            db.Profiles.Add(profile);
        }

        return profile;
    }
}
