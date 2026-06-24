# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Type-check + production build (tsc -b && vite build)
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single-pass (CI)
```

Run a single test file:
```bash
npx vitest run src/__tests__/auth.test.tsx
```

## Architecture

This is a React 18 + TypeScript SPA built with Vite. The dev server proxies all `/api/*` requests to `http://localhost:3000` (the backend), stripping the `/api` prefix before forwarding.

### Context layer (`src/contexts/`)

Three providers wrap the app in this order: `ThemeProvider → AuthProvider → CartProvider`.

- **ThemeContext** — persists `light`/`dark` in `localStorage` and sets `data-theme` on `<html>`.
- **AuthContext** — owns the authenticated `User | null`. On mount it reads `accessToken` from `localStorage` and calls `GET /api/auth/me` to rehydrate. Login/register store both `accessToken` and `refreshToken` in `localStorage`.
- **CartContext** — uses a `useReducer` internally and auto-fetches/clears the server-side cart whenever `user` changes.

### HTTP client (`src/services/api.ts`)

A single Axios instance with base URL `/api`. Its response interceptor handles token refresh: on any `401`, it queues concurrent requests and calls `POST /api/auth/refresh` using a raw `axios` call (bypassing the interceptor to avoid infinite loops). On failure it clears storage and redirects to `/login`.

### Route guards (`src/components/auth/`)

- **PrivateRoute** — redirects to `/login` preserving `location.state.from` so the user lands back after login.
- **AdminRoute** — redirects non-admins to `/`, unauthenticated to `/login`.
- **GuestRoute** — redirects authenticated users to `/`.

All guards render a `div[aria-label="Cargando"]` spinner while `loading` is true.

### Services (`src/services/`)

Thin wrappers over the Axios instance, one file per domain: `auth`, `products`, `categories`, `cart`, `checkout`, `orders`, `health`. Each function returns the raw Axios promise; callers receive typed `AxiosResponse<T>` and access `.data`.

### Hooks (`src/hooks/`)

Custom hooks consume contexts (`useAuth`, `useCart`) or encapsulate fetch logic with cancellation (`useProducts`, `useCategories`, `useHealthCheck`). `useDebounce` is a generic utility used for search inputs.

### Admin panel (`src/pages/AdminPage.tsx`)

Tab-based SPA-within-SPA with four tabs: Dashboard, Productos, Categorías, Órdenes. Uses `Layout` with `hideSidebar` prop. Each tab is a self-contained component under `src/components/admin/`.

### Shared layout (`src/components/layout/`)

`Layout` renders `Navbar + (optional Sidebar) + main + Footer`. Pass `hideSidebar` to suppress the sidebar (used on checkout and admin pages).

### Types (`src/types/index.ts`)

Single source of truth for all shared types: `User`, `Product`, `Category`, `Order`, `Cart`, `CartItem`, `AuthTokens`, DTOs, and enums.

## Testing

Tests use Vitest + `@testing-library/react` + `jsdom`. The Axios instance is always mocked at the module level using `vi.hoisted` + `vi.mock('../services/api', ...)` — never mock individual service functions. Provide `AuthContext.Provider` and `CartContext.Provider` directly when testing pages that need them, rather than rendering the full provider tree.
