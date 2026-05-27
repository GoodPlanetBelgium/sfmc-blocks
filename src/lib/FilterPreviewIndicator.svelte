<script lang="ts">
  let { label }: { label: string } = $props()
  let hovered = $state(false)
</script>

{#if label}
  <div
    class="indicator"
    class:hovered
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => (hovered = false)}
    role="status"
    aria-label={label}
  >
    <div class="dot"></div>
    <span class="label">{label}</span>
  </div>
{/if}

<style>
  .indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0;
    background: white;
    border: 1px solid rgba(0, 120, 212, 0.3);
    border-radius: 20px;
    padding: 2px;
    overflow: hidden;
    max-width: 24px;
    transition:
      max-width 0.25s ease,
      padding 0.25s ease,
      gap 0.25s ease;
    cursor: pointer;
  }
  .indicator.hovered {
    max-width: 400px;
    padding: 2px 8px 2px 4px;
    gap: 5px;
  }
  .dot {
    width: 8px;
    height: 8px;
    min-width: 8px;
    border-radius: 50%;
    background: #d4001c;
    flex-shrink: 0;
    margin: 5px;
  }
  .label {
    font-size: 10px;
    font-family: sans-serif;
    color: #d4001c;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.15s ease 0.1s;
  }
  .indicator.hovered .label {
    opacity: 1;
  }
</style>
