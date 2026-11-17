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
import { describe, expect, it } from 'vitest'

import {
  MODEL_DESCRIPTIONS,
  resolveModelDescription,
} from '../lib/model-descriptions'

describe('resolveModelDescription', () => {
  it('prefers the stored description over the synced map', () => {
    expect(resolveModelDescription('nano-banana-2-1', '商家自定义介绍')).toBe(
      '商家自定义介绍'
    )
  })

  it('falls back to the synced upstream description when none is stored', () => {
    expect(resolveModelDescription('nano-banana-2-1')).toContain(
      '文生图与改图同一个模型'
    )
    expect(resolveModelDescription('seedance-2.5')).toContain('长片与编辑档')
    expect(resolveModelDescription('gemini-3.8-flash')).toContain(
      '奔着编码和 agent 去的 Flash'
    )
  })

  it('returns undefined when neither a stored nor a synced description exists', () => {
    expect(resolveModelDescription('example-model')).toBeUndefined()
    expect(resolveModelDescription('example-model', '')).toBeUndefined()
  })
})

describe('MODEL_DESCRIPTIONS', () => {
  it('covers every commercial model the station sells', () => {
    const commercial = [
      'nano-banana-2-1',
      'doubao-seedream-5-5',
      'gpt-image-2.6-sunburst',
      'gpt-image-2.6-flare',
      'gpt-image-2.5-flare',
      'gpt-image-2.5-sunburst',
      'qwen3-image',
      'qwen3-image-pro',
      'gemini-3-pro-image',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'claude-opus-5',
      'gemini-3.1-pro-preview',
      'deepseek-v4-pro',
      'gpt-6.1-sol',
      'grok-4.6',
      'seedance-2.5',
      'kling-4.0',
      'wan-3.0-video',
      'minimax-h3',
    ]
    for (const model of commercial) {
      expect(MODEL_DESCRIPTIONS[model], model).toBeTruthy()
    }
  })

  it('has no empty descriptions', () => {
    for (const [model, description] of Object.entries(MODEL_DESCRIPTIONS)) {
      expect(description.trim().length, model).toBeGreaterThan(0)
    }
  })
})
