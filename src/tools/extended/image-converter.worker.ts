type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'
type ConvertRequest = { file: File; format: ImageFormat; quality: number; background: string; width: number; height: number; keepAspect: boolean }

function outputDimensions(sourceWidth: number, sourceHeight: number, width: number, height: number, keepAspect: boolean) {
  if (!width && !height) return { width: sourceWidth, height: sourceHeight }
  if (!keepAspect) return { width: width || sourceWidth, height: height || sourceHeight }
  if (width && height) {
    const scale = Math.min(width / sourceWidth, height / sourceHeight)
    return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) }
  }
  if (width) return { width, height: Math.max(1, Math.round(sourceHeight * width / sourceWidth)) }
  return { width: Math.max(1, Math.round(sourceWidth * height / sourceHeight)), height }
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ConvertRequest>) => void) | null
  postMessage: (message: unknown) => void
}

workerScope.onmessage = async (event) => {
  let bitmap: ImageBitmap | null = null
  try {
    const { file, format, quality, background, width, height, keepAspect } = event.data
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = outputDimensions(bitmap.width, bitmap.height, width, height, keepAspect)
    if (size.width > 16384 || size.height > 16384 || size.width * size.height > 100_000_000) throw new Error('输出尺寸超过 16,384 像素边长或 1 亿像素安全上限')
    const canvas = new OffscreenCanvas(size.width, size.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法创建离屏图片画布')
    if (format === 'image/jpeg') { context.fillStyle = background; context.fillRect(0, 0, size.width, size.height) }
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await canvas.convertToBlob({ type: format, quality: format === 'image/png' ? undefined : quality })
    workerScope.postMessage({ ok: true, blob, width: size.width, height: size.height })
  } catch (cause) { workerScope.postMessage({ ok: false, error: cause instanceof Error ? cause.message : '图片转换失败' }) }
  finally { bitmap?.close() }
}
