<script lang="ts">
  import { base, resolve } from '$app/paths'
</script>

<svelte:head>
  <title>SFMC Blocks</title>
</svelte:head>

<h1 class="text-2xl">SFMC Blocks</h1>
<ul>
  <li><a href={resolve('/cta-button')}>cta-button</a></li>
  <li><a href={resolve('/title')}>title</a></li>
  <li><a href={resolve('/rich-text')}>rich-text</a></li>
  <li><a href={resolve('/table-of-contents')}>table-of-contents</a></li>
</ul>
