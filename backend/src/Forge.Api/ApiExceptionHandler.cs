using Forge.Application;
using Microsoft.AspNetCore.Diagnostics;

namespace Forge.Api;

/// <summary>Traduit les erreurs métier en réponses « problem details » ; le titre porte le message à afficher.</summary>
public sealed class ApiExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        int? status = exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ConflictException => StatusCodes.Status409Conflict,
            RuleViolationException => StatusCodes.Status400BadRequest,
            _ => null,
        };
        if (status is null) return false;

        httpContext.Response.StatusCode = status.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = { Status = status, Title = exception.Message },
        });
    }
}
