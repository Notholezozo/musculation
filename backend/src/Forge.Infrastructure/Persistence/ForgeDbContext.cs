using Forge.Application;
using Forge.Domain;
using Microsoft.EntityFrameworkCore;

namespace Forge.Infrastructure.Persistence;

public class ForgeDbContext(DbContextOptions<ForgeDbContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<WorkoutExercise> WorkoutExercises => Set<WorkoutExercise>();
    public DbSet<WorkoutSet> WorkoutSets => Set<WorkoutSet>();
    public DbSet<Profile> Profiles => Set<Profile>();

    async Task IUnitOfWork.SaveChangesAsync(CancellationToken ct) => await SaveChangesAsync(ct);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Les identifiants sont créés par le code : une entité neuve atteinte par navigation est donc insérée.
        modelBuilder.Entity<Exercise>(b =>
        {
            b.Property(e => e.Id).ValueGeneratedNever();
            b.Property(e => e.Name).HasMaxLength(Exercise.NameMaxLength).IsRequired();
            b.Property(e => e.MuscleGroup).HasConversion<string>().HasMaxLength(20);
            b.Property(e => e.Notes).HasMaxLength(Exercise.NotesMaxLength);
            b.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Workout>(b =>
        {
            b.Property(w => w.Id).ValueGeneratedNever();
            b.Property(w => w.Name).HasMaxLength(Workout.NameMaxLength).IsRequired();
            b.Property(w => w.Notes).HasMaxLength(Workout.NotesMaxLength);
            b.HasIndex(w => w.Date);
            b.HasMany(w => w.Exercises).WithOne(e => e.Workout)
                .HasForeignKey(e => e.WorkoutId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkoutExercise>(b =>
        {
            b.Property(e => e.Id).ValueGeneratedNever();
            // Propriétés calculées : sans cela, EF y verrait d'autres relations vers les séries.
            b.Ignore(e => e.OrderedSets);
            b.Ignore(e => e.HeaviestSet);
            // Un exercice utilisé ne se supprime pas : l'historique des séances en dépend.
            b.HasOne(e => e.Exercise).WithMany()
                .HasForeignKey(e => e.ExerciseId).OnDelete(DeleteBehavior.Restrict);
            b.HasMany(e => e.Sets).WithOne()
                .HasForeignKey(s => s.WorkoutExerciseId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkoutSet>(b => b.Property(s => s.Id).ValueGeneratedNever());

        modelBuilder.Entity<Profile>(b =>
        {
            b.Property(p => p.Id).ValueGeneratedNever();
            b.Property(p => p.Name).HasMaxLength(Profile.NameMaxLength);
        });
    }
}
