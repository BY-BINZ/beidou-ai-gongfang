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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PopularModels } from '../popular-models'

function HomeSections() {
  return <PopularModels />
}

async function renderSections() {
  const router = createRouter({
    routeTree: createRootRoute({ component: HomeSections }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

describe('Home sections', () => {
  it('popular models lists real upstream model names with pure points prices (no RMB)', async () => {
    await renderSections()
    expect(
      screen.getByRole('heading', {
        name: 'Text, image and video — the models merchants actually use',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Popular Models')).toBeInTheDocument()
    expect(screen.getByText('gemini-3.8-flash')).toBeInTheDocument()
    expect(screen.getByText('claude-opus-5')).toBeInTheDocument()
    expect(screen.getByText('gpt-6.1-sol')).toBeInTheDocument()
    expect(screen.getByText('grok-4.6')).toBeInTheDocument()
    expect(screen.getByText('gpt-image-2.6-sunburst')).toBeInTheDocument()
    expect(screen.getByText('gpt-image-2.6-flare')).toBeInTheDocument()
    expect(screen.getByText('nano-banana-2-1')).toBeInTheDocument()
    expect(screen.getByText('gpt-image-2')).toBeInTheDocument()
    expect(screen.getByText('gemini-3.1-flash-image-preview')).toBeInTheDocument()
    expect(screen.getByText('kling-4.0-flash')).toBeInTheDocument()
    expect(screen.getByText('wan-3.0-video')).toBeInTheDocument()
    // Pure points only — no ¥ RMB shown on model cards.
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /View Model Square/ })
    ).toHaveAttribute('href', '/pricing')
  })
})
