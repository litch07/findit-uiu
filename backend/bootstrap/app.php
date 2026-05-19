<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminOnly::class,
        ]);
    })
    ->withExceptions(function (Exceptions $e) {
        $e->render(function (\Throwable $ex, $request) {
            if ($request->is('api/*')) {
                if ($ex instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed.',
                        'errors' => $ex->errors(),
                    ], 422);
                }

                $status = match (true) {
                    $ex instanceof \Illuminate\Auth\AuthenticationException => 401,
                    $ex instanceof \Illuminate\Auth\Access\AuthorizationException => 403,
                    $ex instanceof \Illuminate\Database\Eloquent\ModelNotFoundException => 404,
                    $ex instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface => $ex->getStatusCode(),
                    default => 500,
                };

                return response()->json([
                    'success' => false,
                    'message' => $status >= 500
                        ? 'Server error.'
                        : $ex->getMessage(),
                ], $status);
            }
        });
    })->create();
