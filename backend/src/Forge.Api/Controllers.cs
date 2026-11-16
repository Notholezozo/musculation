using Forge.Application;
using Microsoft.AspNetCore.Mvc;

namespace Forge.Api;

[ApiController]
[Route("api/exercises")]
public sealed class ExercisesController(ExerciseService exercises) : ControllerBase
{
    [HttpGet]
    public Task<List<ExerciseDto>> List(CancellationToken ct) => exercises.ListAsync(ct);

    [HttpPost]
    public Task<ExerciseDto> Create(SaveExerciseRequest request, CancellationToken ct) =>
        exercises.CreateAsync(request, ct);

    [HttpPut("{id:guid}")]
    public Task<ExerciseDto> Update(Guid id, SaveExerciseRequest request, CancellationToken ct) =>
        exercises.UpdateAsync(id, request, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await exercises.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/progress")]
    public Task<ExerciseProgressDto> Progress(Guid id, CancellationToken ct) => exercises.GetProgressAsync(id, ct);

    /// <summary>Dernier passage sur l'exercice, strictement avant <paramref name="before"/> s'il est donné. 204 s'il n'y en a pas.</summary>
    [HttpGet("{id:guid}/last")]
    public async Task<ActionResult<LastPerformanceDto>> Last(Guid id, DateOnly? before, CancellationToken ct)
    {
        var last = await exercises.GetLastPerformanceAsync(id, before, ct);
        return last is null ? NoContent() : last;
    }
}

[ApiController]
[Route("api/workouts")]
public sealed class WorkoutsController(WorkoutService workouts) : ControllerBase
{
    [HttpGet]
    public Task<List<WorkoutSummaryDto>> List(DateOnly? from, DateOnly? to, CancellationToken ct) =>
        workouts.ListAsync(from, to, ct);

    [HttpGet("{id:guid}")]
    public Task<WorkoutDto> Get(Guid id, CancellationToken ct) => workouts.GetAsync(id, ct);

    [HttpPost]
    public Task<WorkoutDto> Create(SaveWorkoutRequest request, CancellationToken ct) =>
        workouts.CreateAsync(request, ct);

    [HttpPut("{id:guid}")]
    public Task<WorkoutDto> Update(Guid id, SaveWorkoutRequest request, CancellationToken ct) =>
        workouts.UpdateAsync(id, request, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await workouts.DeleteAsync(id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/profile")]
public sealed class ProfileController(ProfileService profile) : ControllerBase
{
    [HttpGet]
    public Task<ProfileDto> Get(CancellationToken ct) => profile.GetAsync(ct);

    [HttpPut]
    public Task<ProfileDto> Update(SaveProfileRequest request, CancellationToken ct) =>
        profile.UpdateAsync(request, ct);

    [HttpGet("records")]
    public Task<List<PersonalRecordDto>> Records(CancellationToken ct) => profile.GetRecordsAsync(ct);
}
