<script lang="ts">
  interface Props {
    /** Thumb positions, in percent of the track, in ascending order. */
    values: number[]
    /** Allowed travel of thumb `index`; the caller clamps too, this only limits the UI. */
    bounds: (index: number) => { min: number; max: number }
    step?: number
    onchange: (index: number, value: number) => void
    labelFor?: (index: number) => string
  }

  let { values, bounds, step = 5, onchange, labelFor }: Props = $props()

  let trackEl = $state<HTMLDivElement | null>(null)
  let dragging = $state<number | null>(null)

  function snap(index: number, raw: number): number {
    const { min, max } = bounds(index)
    return Math.min(max, Math.max(min, Math.round(raw / step) * step))
  }

  function positionFrom(event: PointerEvent): number | null {
    if (!trackEl) return null
    const rect = trackEl.getBoundingClientRect()
    if (rect.width === 0) return null
    return ((event.clientX - rect.left) / rect.width) * 100
  }

  function handlePointerDown(index: number, event: PointerEvent): void {
    dragging = index
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent): void {
    if (dragging === null) return
    const raw = positionFrom(event)
    if (raw === null) return
    const next = snap(dragging, raw)
    if (next !== values[dragging]) onchange(dragging, next)
  }

  function handlePointerUp(event: PointerEvent): void {
    if (dragging === null) return
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    dragging = null
  }

  function handleKeyDown(index: number, event: KeyboardEvent): void {
    const delta =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -step
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? step
          : 0
    if (delta === 0) return
    event.preventDefault()
    onchange(index, snap(index, values[index] + delta))
  }
</script>

<div bind:this={trackEl} class="relative h-4 flex items-center select-none">
  <div class="w-full h-1.5 rounded-full bg-[#ddd]"></div>
  {#each values as value, i (i)}
    {@const range = bounds(i)}
    <button
      type="button"
      role="slider"
      tabindex="0"
      aria-label={labelFor?.(i) ?? `Divider ${i + 1}`}
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={value}
      onpointerdown={(e) => handlePointerDown(i, e)}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
      onkeydown={(e) => handleKeyDown(i, e)}
      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#0078d4] border-2 border-white shadow cursor-ew-resize touch-none focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 {dragging ===
      i
        ? 'scale-110'
        : ''}"
      style="left: {value}%"
      aria-orientation="horizontal"
    ></button>
  {/each}
</div>
