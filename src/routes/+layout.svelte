<script lang="ts">
  import '../app.css'
  import CropperModal from '../components/CropperModal.svelte'

  let { children } = $props()
</script>

<CropperModal />
{@render children()}
