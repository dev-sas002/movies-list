# Movies List

A personal film collection you sign into and curate: add a movie with a poster, a year, a
synopsis and tags, then find it again by typing what you half-remember rather than by
scrolling. Two packages share one typed HTTP contract — `movies-list-api` (Express +
TypeScript on MongoDB) and `movies-list-web` (Create React App + TypeScript + Tailwind).

![The movie grid, populated with seeded films and generated poster art](docs/screenshots/01-movie-grid.png)

Nothing in that grid is stock artwork. The seeder draws each poster as an SVG from the
title, year and tags (`movies-list-api/src/db/posterArt.ts`), so a fresh checkout has a
collection worth looking at without shipping image files.

## Finding a film you half-remember

The search box takes a sentence, not a keyword. "90s sci-fi with a female lead" becomes a
year range, a tag filter, a text term and a sort order — and the app shows you its reading
of the sentence before you trust the results:

![A search for "90s sci-fi with a female lead", showing the rule-based interpretation and its single result](docs/screenshots/02-natural-language-search.png)

That banner — `RULE-BASED`, then *Showing movies matching "female lead", tagged sci-fi,
from 1990–1999, newest first* — is the planner's own output rendered back to you
(`describePlan` in `search/types.ts`). A search that misunderstands you says so.

Two planners implement the one `SearchPlanner` interface — a `name` and a
`plan(query: string): Promise<SearchPlan>`.

`heuristicPlanner` is rule-based, dependency-free and always available: genre words and
their common spellings, decade and year phrasings, and a stop-word list for the remainder.
`anthropicPlanner` sends the sentence to Claude with a structured-output schema and **falls
back to the heuristic planner on every failure path** — no key, network error, malformed
output, or its 8-second timeout. A registry in `search/index.ts` picks one at startup, and
`setSearchPlanner()` swaps in another without the service layer knowing which is in play.
No test makes a real API call — the AI planner's tests inject a fake client.

## Getting it running

### With Docker

One command brings up MongoDB, seeds a demo collection with generated poster art, and
starts both services:

```bash
JWT_SECRET=$(openssl rand -base64 48) docker compose up --build
```

| Service | URL |
| --- | --- |
| Web client | <http://localhost:8290> |
| API | <http://localhost:8291> |
| API health | <http://localhost:8291/health> |

Sign in as **test@example.com** / **password123** (override with `SEED_EMAIL` and
`SEED_PASSWORD`). MongoDB is reachable only from the compose network — it is not published
to the host. Adding `ANTHROPIC_API_KEY=sk-ant-...` switches search to the AI planner and
changes nothing else. Tear it down with `docker compose down -v`. `JWT_SECRET` is written
`${JWT_SECRET:?...}` in `docker-compose.yml`, so the stack refuses to start without one
rather than falling back to anything.

> **Status of this compose file, precisely.** Parse-checked only. The project log records
> Build verified as *NOT RUN — deferred, RAM constraint* and Boot verified as *NOT RUN —
> deferred, RAM constraint*: these images have never been built or booted here. Ports,
> healthchecks, non-root users and service gating are verified by reading and by
> `docker compose config` — treat the images themselves as unproven.

### Without Docker

You need a MongoDB reachable at `MONGODB_URI`.

```bash
npm install --prefix movies-list-api
npm install --prefix movies-list-web
npm install                                   # root, for concurrently

cp movies-list-api/.env_sample movies-list-api/.env   # then set JWT_SECRET
npm run db:seed                                       # safe to re-run
npm start                                             # web :3000, API :3001
```

> **`bcrypt` with npm's `ignore-scripts` set globally.** Its native binary arrives through a
> postinstall script, so the install succeeds but the API then fails at runtime with
> `Could not locate the bindings file`. Fix:
> `npm rebuild bcrypt --build-from-source --prefix movies-list-api`. Docker is unaffected.

Scripts, all from the repository root:

| Command | What it does |
| --- | --- |
| `npm test` | 161 API tests + 83 web tests. |
| `npm run typecheck` | `tsc --noEmit` over both packages. |
| `npm run lint` / `npm run format:check` | ESLint and Prettier over the API sources. |
| `npm run build` | API to `dist/`, web to `build/`. |
| `npm run db:seed` | Demo user, movies, poster art, and index sync. |
| `npm run contract:sync` | Re-copies `shared/contracts/api.ts` into both packages. |

## The data, and why it is shaped this way

```mermaid
erDiagram
    USER ||--o{ MOVIE : owns
    USER ||--o| SESSION : "holds at most one"

    USER {
        ObjectId _id PK
        string email UK "lowercased, trimmed, unique"
        string password "bcrypt hash"
        string authToken "the current JWT, or null"
    }

    SESSION {
        string token "no collection of its own - it is USER.authToken"
        string ttl "1h, carried in the JWT"
    }

    MOVIE {
        ObjectId _id PK
        ObjectId userId FK "every query filters on this first"
        string title
        number publishYear
        string synopsis
        array tags "free text"
        Buffer image "poster bytes - left out of every projection but the poster route"
        string imageHash "sha-256 - drives the signed poster URL and the ETag"
        date createdAt
    }
```

`SESSION` is drawn separately to make the rule visible, but it is not a collection — the
token is one field on the user document, which is why a second sign-in ends the first.

Every list query filters by `userId` and then sorts, so `models/movie.ts` declares compound
indexes on `{userId, createdAt}`, `{userId, publishYear}`, `{userId, title}` and
`{userId, tags}`, plus a weighted text index over title, synopsis and tags (a title hit
outranks a synopsis hit 10:1). Without them MongoDB collection-scans and sorts in memory,
which stops working outright past 32 MB of matching documents. `index.ts` calls
`syncIndexes()` on boot, so a fresh database gets them.

Dependencies point inward, one direction only: `routes/` are thin HTTP adapters,
`services/` hold the use cases, `repositories/` are the only modules that touch Mongoose,
and `models/` own the schemas. The screenshots above are what that layering bought — they
were captured against the real compiled API with only the two repository modules swapped
for in-memory arrays. No MongoDB was involved.

## What a token is allowed to do

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant R as routes/
    participant A as middlewares/auth
    participant S as services/
    participant D as repositories → MongoDB

    B->>R: POST /login { email, password }
    R->>S: authService.login(...)
    Note over S: both fields must be non-empty strings —<br/>Mongoose strips an undefined filter, so<br/>findOne({}) would return an arbitrary user
    S->>D: findByEmail(email)
    D-->>S: user
    S->>S: bcrypt.compare(password, user.password)
    S->>S: jwt.sign({ userId }, getJwtSecret(), { expiresIn: '1h' })
    S->>D: saveSessionToken(user, token)
    S-->>R: { token, user }
    R-->>B: 200 — client stores it in services/session.ts

    Note over B,R: every later call sends Authorization: Bearer <token>

    B->>R: PUT /movies/:id (multipart, replacement poster)
    R->>A: authMiddleware
    A->>S: authService.authenticate(token)
    S->>S: jwt.verify(token, getJwtSecret())
    S->>D: findBySessionToken(userId, token)

    alt token is not the one stored on that user
        D-->>S: no match
        S-->>B: 401 { message, code }
    else current token
        D-->>A: user → req.user
        A->>S: movieService.updateMovie(userId, id, input, poster)
        S->>S: sha-256 the upload → new imageHash
        S->>D: update scoped to { _id, userId }
        D-->>S: movie
        S->>S: toDto() → HMAC-sign the new posterUrl
        S-->>R: movie
        R-->>B: 200 { message, movie }
    end
```

Three properties of that flow are deliberate and worth not regressing:

- **The signing secret comes from the environment and has no default.** `getJwtSecret()`
  (in `config/env.ts`) throws when `JWT_SECRET` is unset, and `startServer()` calls it
  before it connects to anything, so a missing secret stops the process at boot instead of
  surfacing later as a broken login. A missing `MONGODB_URI` throws in the connect step
  immediately after.
- **A stale token cannot log anyone out.** `logout` checks that the presented token is the
  one currently stored on the user before clearing it.
- **Ownership is enforced in the query, not after it.** Repository reads and writes are
  scoped to `userId`, so a guessed movie id returns `404`, not someone else's film.

Every error response has the same shape, `{ message, code }`, where `code` is one of the
`ERROR_CODES` in the shared contract.

## Keeping the list cheap

`GET /movies` is the endpoint everything else hangs off, and the first to get expensive.
Three things keep the response small, and a fourth keeps the page that renders it small.

**Pagination and projection.** `page` and `pageSize` (default 12, capped at 100 — the web
client asks for 8) with a `MOVIE_PROJECTION` that leaves poster bytes out of every query
except the poster route itself.

![Page two of the collection, showing the Previous / Next control and the total count](docs/screenshots/04-pagination.png)

**Posters as capability URLs.** An `<img>` tag cannot send an `Authorization` header, so
each poster gets a signed URL rather than a widened route: an HMAC over
(owner, movie, content hash), derived from `JWT_SECRET` through a labelled sub-key. The
content hash sits in both the signature and the query string, so the response is safely
served `immutable` for a year and replacing a poster invalidates the old URL for free.
Poster responses also carry `nosniff` and a `default-src 'none'; sandbox` CSP, because the
generated art is SVG and SVG can carry script. Uploads are limited to JPEG, PNG, WebP, GIF.

**A bounded read-through cache.** List pages are cached by user, plan and page for
`LIST_CACHE_TTL_MS`; every write drops that user's pages by key prefix. The store is capped
at 500 entries with LRU eviction — an unbounded map keyed by user and query is a memory
leak wearing a cache costume — and sits behind the `CacheStore` interface so Redis can
replace it.

**Code-split routes.** `Router.tsx` loads all four pages through `React.lazy`, keeping the
form stack out of the chunk that renders the list. `npm run build` on this tree emits a
144,004 B entry bundle (46,779 B gzipped) plus eight lazy chunks, 350,514 B raw in total —
Formik and Yup together in one 79,409 B chunk, the dropzone in a 61,449 B chunk, neither
fetched until you open a form. Re-derive with `npm run build`.

## Environment

`movies-list-api`, all read through `src/config/env.ts` — lazily, so values arrive after
`dotenv.config()` whatever the import order:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `JWT_SECRET` | **yes** | _none — throws_ | Signs and verifies JWTs, and derives the poster URL signing key. `openssl rand -base64 48`. |
| `MONGODB_URI` | **yes** | _none — throws_ | Connection string, without the database name. |
| `MONGODB_DB` | no | `movie-list` | Database name appended to `MONGODB_URI`. |
| `PORT` | no | `3001` | Port the API listens on. |
| `CORS_ORIGINS` | no | `*` | Comma-separated allowed origins. Pin this in any real deployment. |
| `MAX_UPLOAD_BYTES` | no | `5242880` | Largest poster upload accepted (5 MB). |
| `LIST_CACHE_TTL_MS` | no | `30000` | How long a list page stays cached. |
| `ANTHROPIC_API_KEY` | no | _unset_ | Enables AI-assisted search. Unset means the rule-based planner. |
| `ANTHROPIC_MODEL` | no | `claude-opus-5` | Model used for search planning. |
| `SEED_EMAIL` / `SEED_PASSWORD` | no | `test@example.com` / `password123` | Demo account created by `npm run db:seed`. |

`movies-list-web` has one, and Create React App inlines it at **build** time:
`REACT_APP_SERVER_URL` (default `http://localhost:3001`) is the API's address as the
*browser* reaches it — compose bakes in `http://localhost:8291`.

## The HTTP surface

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/login` | `{ email, password }` → `{ token, user }`. |
| `POST` | `/logout` | Bearer token, revokes that exact session. |
| `GET` | `/health` | `200` with uptime, database and AI-search status; `503` when MongoDB is disconnected. |
| `GET` | `/movies` | `page`, `pageSize`, `q`, `sort`. Returns movies, pagination and the search interpretation. |
| `POST` | `/movies` | `multipart/form-data`; a poster is required. |
| `GET` | `/movies/:id` | Single movie. |
| `PUT` | `/movies/:id` | `multipart/form-data`; the poster is replaced only if one is sent. |
| `DELETE` | `/movies/:id` | Removes the movie. |
| `GET` | `/movies/:id/poster` | Signed, immutable poster bytes; `304` on a matching `ETag`. |

A Postman collection lives in [`postman/`](postman/Movie-List.postman_collection.json).

The edit screen exercises most of this at once — a `GET /movies/:id`, a poster fetched from
its signed URL, then a `PUT` that replaces the image only if you dropped a new one:

![The edit form, with labelled fields and the stored poster loaded from its signed URL](docs/screenshots/03-edit-movie.png)

## Where things live

```
shared/contracts/api.ts     SOURCE OF TRUTH for the HTTP contract
scripts/sync-contracts.js   copies it into both packages

movies-list-api/src/
  index.ts                  boot: read the secret, connect, sync indexes, listen
  config/env.ts             every env var, read lazily; required ones throw
  routes/ middlewares/      HTTP adapters; auth, asyncRoute, errorHandler
  services/                 use cases — the layer to read first
    movieService.ts / authService.ts / posterUrl.ts / cache.ts
  search/                   the SearchPlanner seam: types, heuristic, anthropic, registry
  repositories/             the ONLY Mongoose access in the codebase
  models/ db/               schemas and indexes; connection, seeder, poster art

movies-list-web/src/
  services/api.ts           the only module that speaks HTTP
  services/session.ts       the only module that knows where the token lives
  pages/ components/ routes/Router.tsx    screens, widgets, lazily-loaded routes
```

Create React App refuses to compile imports from outside `src/`, which is why the contract
is copied rather than imported. `movies-list-api/src/__tests__/contract.test.ts` fails if
the API's copy drifts from `shared/contracts/api.ts`. **The web copy has no equivalent
test** — it is byte-identical today, but only `npm run contract:sync` keeps it so.

## Known gaps

- **One session per user, and no sign-up flow.** The token lives on the user document, so a
  second sign-in ends the first; accounts come from the seeder.
- **Posters live in MongoDB.** Fine at this scale and it keeps the stack to one datastore,
  but object storage behind a CDN is the answer past a few thousand images — a move the
  capability-URL scheme confines to `posterUrl.ts` and the poster route.
- **The cache is per-process.** Two API containers keep two caches, so a write on one is
  invisible to the other for up to `LIST_CACHE_TTL_MS`.
- **Search is single-language and literal.** The rule-based planner knows a fixed list of
  genre words and date phrasings, the AI planner reads prose far better but needs a key,
  and neither does semantic similarity over synopses.
- **No refresh tokens and no rate limiting.** Tokens last an hour, and login is not
  throttled.
- **Tags are free text**, so `sci-fi` and `scifi` are two tags if you type both.
