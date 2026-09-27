# Groq OpenAI-compatible proxy for Deno Deploy

This service forwards OpenAI-compatible Groq API requests to `https://api.groq.com/openai/v1`.

## Configure secrets

Set these two application environment variables in Deno Deploy before deploying:

- `GROQ_API_KEY`: your Groq API key.
- `PROXY_API_KEY`: a separate, long random token used by clients to access this proxy.

Do not commit either value to source control. The proxy rejects requests until both values are configured.

## Routes

- `GET /health` returns a status response.
- `/openai/v1/*` forwards requests to the matching Groq OpenAI API endpoint.

For example, `POST https://YOUR_APP.deno.dev/openai/v1/chat/completions` with `Authorization: Bearer YOUR_PROXY_API_KEY` works with OpenAI-compatible SDKs by setting the base URL to `https://YOUR_APP.deno.dev/openai/v1`.

## Deploy

From this directory, authenticate with `deno deploy login` if needed, then create the app with `deno deploy create` and choose the Deno Deploy organization/application. Add the two environment variables in the application's Settings, then deploy to production with `deno deploy --prod`.
