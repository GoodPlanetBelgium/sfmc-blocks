<script lang="ts">
  import Cropper from 'cropperjs'
  import 'cropperjs/dist/cropper.css'
  import { uploadImage } from '$lib/sfmc-assets'
  import { cropperStore } from '$lib/cropperStore'
  import { PUBLIC_ASSETS_ENDPOINT } from '$env/static/public'

  let imageUrl = $state<string | null>(null)
  let categoryId = $state<number | null>(null)
  let onApply = $state<((url: string, assetId: number) => void) | null>(null)
  let onClose = $state<(() => void) | null>(null)

  let imgElement = $state<HTMLImageElement | null>(null)
  let cropper = $state<Cropper | null>(null)
  let uploading = $state(false)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let blobUrl = $state<string | null>(null)
  let isProcessing = $state(false)

  $effect(() => {
    const unsubscribe = cropperStore.subscribe((state) => {
      console.log('CropperModal: store updated', { imageUrl: state.imageUrl, categoryId: state.categoryId })
      imageUrl = state.imageUrl
      categoryId = state.categoryId
      onApply = state.onApply
      onClose = state.onClose

      // If imageUrl changed, fetch via proxy immediately
      // In dev: use local Vite proxy
      // In production: use goodplanet-apps sfmc-assets proxy (with CORS headers)
      if (imageUrl) {
        loading = true
        const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        console.log(isDev ? 'Dev mode: fetching via local proxy' : 'Production: fetching via sfmc-assets proxy')
        fetchImageViaProxy()
      }
    })
    return unsubscribe
  })

  async function onImageLoad(): Promise<void> {
    console.log('onImageLoad called (production path)', { isProcessing, blobUrl, imageUrl })
    if (isProcessing || blobUrl || !imageUrl) return

    // This fires in production when image loads with CORS
    console.log('Production: image loaded via CORS, initializing cropper')
    setTimeout(() => {
      initializeCropper()
    }, 100)
  }

  async function fetchImageViaProxy(): Promise<void> {
    if (!imageUrl) return
    try {
      // Determine proxy URL based on environment
      const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      let proxyUrl: string

      if (isDev) {
        // Dev: use local Vite proxy
        proxyUrl = `/proxy-image?url=${encodeURIComponent(imageUrl)}`
      } else {
        // Production: use goodplanet-apps sfmc-assets proxy
        // PUBLIC_ASSETS_ENDPOINT could be:
        //   https://sfmc-auth.goodplanet.be/api/assets
        //   https://sfmc-assets.goodplanet.be/api/assets
        // We need: {domain}/api/proxy-image
        const baseUrl = PUBLIC_ASSETS_ENDPOINT.replace(/\/api\/.*$/, '/api/proxy-image')
        proxyUrl = `${baseUrl}?url=${encodeURIComponent(imageUrl)}`
      }

      console.log('Fetching through proxy:', proxyUrl)
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)
      const blob = await response.blob()
      blobUrl = URL.createObjectURL(blob)

      if (imgElement) {
        imgElement.src = blobUrl
        console.log('Proxy image loaded, initializing cropper...')
        setTimeout(() => {
          initializeCropper()
          loading = false
        }, 100)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Proxy fetch failed:', msg)
      error = `Failed to load image: ${msg}`
      loading = false
    }
  }

  function initializeCropper(): void {
    if (!imgElement || cropper) {
      console.error('Cannot init cropper:', { imgElement: !!imgElement, cropper: !!cropper })
      return
    }

    try {
      console.log('Creating Cropper instance...')
      // Initialize Cropper.js
      cropper = new Cropper(imgElement, {
        aspectRatio: NaN, // free-form
        autoCropArea: 1,
        responsive: true,
        guides: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: true,
        viewMode: 1,
        minContainerWidth: 200,
        minContainerHeight: 200
      })
      console.log('Cropper initialized successfully')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Cropper init error:', msg)
      error = `Failed to initialize cropper: ${msg}`
    }
  }

  $effect(() => {
    return () => {
      if (cropper) {
        try {
          cropper.destroy()
        } catch (e) {
          console.error('Error destroying cropper:', e)
        }
        cropper = null
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        blobUrl = null
      }
    }
  })

  function rotate(degrees: number): void {
    if (!cropper) return
    try {
      const data = cropper.getData()
      const currentRotate = (data.rotate || 0) as number
      cropper.setData({ rotate: currentRotate + degrees })
    } catch (e) {
      error = `Failed to rotate: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  async function applyCrop(): Promise<void> {
    if (!cropper || categoryId === null || !imageUrl) {
      error = 'Unable to determine upload location'
      return
    }

    uploading = true
    error = null

    try {
      // Get the cropped canvas
      const canvas = cropper.getCroppedCanvas()
      if (!canvas) throw new Error('Failed to get cropped image')

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob: Blob | null) => {
            if (!blob) reject(new Error('Failed to create image blob'))
            else resolve(blob)
          },
          'image/jpeg',
          0.95
        )
      })

      // Generate filename from original image URL
      const urlPath = new URL(imageUrl).pathname
      const lastSlash = urlPath.lastIndexOf('/')
      const fullFilename = lastSlash !== -1 ? urlPath.substring(lastSlash + 1) : 'cropped-image'

      // Split filename and extension
      const lastDot = fullFilename.lastIndexOf('.')
      let filename = fullFilename

      if (lastDot !== -1) {
        filename = fullFilename.substring(0, lastDot)
      }

      // Always use .jpg extension since we're converting to JPEG
      const croppedFilename = `${filename}-cropped.jpg`

      // Create a File object from the blob for upload
      const file = new File([blob], croppedFilename, { type: 'image/jpeg' })

      console.log('Uploading cropped image:', {
        filename: croppedFilename,
        type: file.type,
        size: file.size,
        categoryId
      })

      // Upload to the same category as the original
      const uploaded = await uploadImage(file, categoryId)
      console.log('Upload successful:', uploaded)

      if (onApply) {
        onApply(uploaded.fileProperties.publishedURL, uploaded.id)
      }
      if (onClose) {
        onClose()
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to crop and upload image'
    } finally {
      uploading = false
    }
  }

  function handleClose(): void {
    if (onClose) {
      onClose()
    }
  }
</script>

{#if imageUrl}
  {console.log('CropperModal rendering with imageUrl:', imageUrl)}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Crop image"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2"
    onclick={(e) => {
      if (e.target === e.currentTarget && !uploading) handleClose()
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape' && !uploading) handleClose()
    }}
>
  <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-[#eee] shrink-0">
      <span class="font-semibold text-sm text-[#333]">Crop image</span>
      <button
        type="button"
        disabled={uploading}
        aria-label="Close"
        onclick={handleClose}
        class="text-[#999] hover:text-[#333] transition-colors disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Cropper container -->
    <div
      class="flex-1 bg-[#f9f9f9] overflow-visible flex items-center justify-center relative"
      style="min-height: 400px; padding: 30px;"
    >
      <div style="width: 100%; max-width: 100%; overflow: visible;">
        <!-- svelte-ignore a11y_img_redundant_alt -->
        <img
          bind:this={imgElement}
          src={imageUrl}
          alt="Image to crop"
          crossorigin="anonymous"
          onload={onImageLoad}
          style="max-width: 100%; height: auto; display: block; margin: 0 auto;"
        />
      </div>

      <!-- Loading spinner -->
      {#if loading}
        <div class="absolute inset-0 flex items-center justify-center bg-white/50">
          <div class="flex flex-col items-center gap-2">
            <svg
              class="animate-spin w-8 h-8 text-[#0176d3]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span class="text-xs text-[#666]">Loading image...</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-4 py-3 border-t border-[#eee] shrink-0 bg-[#f9f9f9]">
      <button
        type="button"
        disabled={uploading}
        onclick={() => rotate(-90)}
        title="Rotate counterclockwise"
        class="px-3 py-1.5 rounded border border-[#ddd] text-xs text-[#333] hover:bg-white disabled:opacity-40"
      >
        ↻ Rotate left
      </button>
      <button
        type="button"
        disabled={uploading}
        onclick={() => rotate(90)}
        title="Rotate clockwise"
        class="px-3 py-1.5 rounded border border-[#ddd] text-xs text-[#333] hover:bg-white disabled:opacity-40"
      >
        Rotate right ↺
      </button>
      {#if error}
        <div class="text-[11px] text-[#d4001c] flex-1">{error}</div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#eee] shrink-0">
      <button
        type="button"
        disabled={uploading}
        onclick={handleClose}
        class="px-3 py-1.5 rounded border border-[#ddd] text-xs text-[#333] hover:bg-[#f5f5f5] disabled:opacity-40"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={uploading}
        onclick={applyCrop}
        class="px-3 py-1.5 rounded bg-[#0176d3] text-white text-xs hover:bg-[#0156a0] disabled:opacity-40"
      >
        {uploading ? 'Uploading…' : 'Apply crop'}
      </button>
    </div>
  </div>
  </div>
{/if}

<style>
  :global(.cropper-container) {
    max-height: 400px;
  }

  :global(.cropper-crop-box) {
    background-color: rgba(1, 118, 211, 0.3);
  }

  :global(.cropper-line, .cropper-point) {
    background-color: #0176d3;
  }

  :global(.cropper-point) {
    width: 10px !important;
    height: 10px !important;
    border: none;
    background-color: #0176d3 !important;
  }

  :global(.cropper-line) {
    background-color: #0176d3;
    width: 2px;
    height: 2px;
  }

  :global(.cropper-handle) {
    width: 10px !important;
    height: 10px !important;
  }

  :global(.cropper-bg) {
    background-image: none;
  }
</style>
