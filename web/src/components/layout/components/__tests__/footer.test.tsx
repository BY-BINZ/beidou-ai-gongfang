/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { STATUS_QUERY_KEY } from '@/lib/status-query'

import { Footer } from '../footer'

async function renderFooter() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Seeded query data stays fresh (5 minute staleTime), so the footer
  // renders from cache and never hits the network in tests.
  client.setQueryData(STATUS_QUERY_KEY, {})
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <Footer /> }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function footerText(): string {
  const footer = document.querySelector('footer')
  if (!footer) throw new Error('missing footer')
  return footer.textContent ?? ''
}

describe('Footer copyright', () => {
  it('renders a single copyright line: station copyright plus the upstream attribution', async () => {
    await renderFooter()
    const text = footerText()
    // Exactly one © statement: the station copyright and the New API
    // attribution share one line instead of two "© … All rights reserved".
    expect(text.match(/©/g)).toHaveLength(1)
    // The upstream attribution stays: name and contributors phrase.
    expect(text).toContain('New API')
    // i18n test setup has no resources, so t() returns the key itself.
    expect(text).toContain('footer.newapi.projectAttributionSuffix')
    expect(text).not.toContain('© 2026 New API')
    // The visible copyright line is the one element carrying the ©.
    expect(screen.getAllByText(/©/)).toHaveLength(1)
  })
})
