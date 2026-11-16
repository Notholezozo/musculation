using Forge.Application;
using Forge.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Forge.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "Forge";

    /// <param name="contentRootPath">Dossier de l'application : un chemin de base relatif y est rattaché.</param>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration, string contentRootPath)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName)
            ?? throw new InvalidOperationException($"Chaîne de connexion '{ConnectionStringName}' manquante.");

        services.AddDbContext<ForgeDbContext>(options =>
            options.UseSqlite(ResolveDataSource(connectionString, contentRootPath)));

        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<ForgeDbContext>());
        services.AddScoped<IExerciseRepository, ExerciseRepository>();
        services.AddScoped<IWorkoutRepository, WorkoutRepository>();
        services.AddScoped<IProfileRepository, ProfileRepository>();

        return services;
    }

    /// <summary>Applique les migrations en attente au démarrage.</summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<ForgeDbContext>().Database.MigrateAsync(ct);
    }

    private static string ResolveDataSource(string connectionString, string contentRootPath)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);

        if (!Path.IsPathRooted(builder.DataSource) && builder.DataSource != ":memory:")
        {
            builder.DataSource = Path.Combine(contentRootPath, builder.DataSource);
        }

        if (Path.GetDirectoryName(builder.DataSource) is { Length: > 0 } directory)
        {
            Directory.CreateDirectory(directory);
        }

        return builder.ToString();
    }
}
