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
  it('popular models lists real upstream model names with reference prices', async () => {
    await renderSections()
    expect(
      screen.getByRole('heading', {
        name: 'Text, image and video — the models merchants actually use',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Popular Models')).toBeInTheDocument()
    // Text models: per-1K-token input/output prices (充值 column, from the
    // 2026-11-14 07:00 live read of the pricing page), shown as CNY +
    // the configured display currency together. Delisted models were
    // replaced with current ones: qwen3-max -> gpt-6.1-sol, grok-4.1 -> grok-4.6.
    // kimi-k3 was removed from the homepage 2026-11-17 (owner decision):
    // it is not in APIMODELS and not in the relay's 178 models.
    expect(screen.getByText('claude-opus-5')).toBeInTheDocument()
    expect(screen.getByText('gemini-3.1-pro-preview')).toBeInTheDocument()
    expect(screen.getByText('gpt-6.1-sol')).toBeInTheDocument()
    expect(screen.getByText('grok-4.6')).toBeInTheDocument()
    expect(screen.queryByText('qwen3-max')).not.toBeInTheDocument()
    expect(screen.queryByText('grok-4.1')).not.toBeInTheDocument()
    expect(screen.queryByText('kimi-k3')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Input ¥0\.0072 · \$0\.0072 \/ 1K tokens/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Output ¥0\.036 · \$0\.036 \/ 1K tokens/)
    ).toBeInTheDocument()
    // Image models: per-image prices (充值 column), CNY + display currency.
    expect(screen.getByText('banana2-official-1k')).toBeInTheDocument()
    expect(screen.getByText('bananaPRO')).toBeInTheDocument()
    expect(screen.getByText('¥0.5 · $0.5 / per image')).toBeInTheDocument()
    expect(screen.getByText('¥0.8 · $0.8 / per image')).toBeInTheDocument()
    expect(screen.getByText('¥1.2 · $1.2 / per image')).toBeInTheDocument()
    expect(screen.getByText('¥0.48 · $0.48 / per image')).toBeInTheDocument()
    // Video models: per-second prices, dynamic ones labelled as such.
    expect(screen.getByText('wan3.0-video')).toBeInTheDocument()
    expect(screen.getByText(/¥0\.7 · \$0\.7 \/ per second/)).toBeInTheDocument()
    expect(screen.getAllByText('Dynamic pricing')).toHaveLength(2)
    // The footnote points to the live price list, not the static numbers.
    // (The Button renders its link with role="button".)
    expect(
      screen.getByRole('button', { name: /View Model Square/ })
    ).toHaveAttribute('href', '/pricing')
  })
})
