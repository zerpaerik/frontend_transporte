// Redimensiona y comprime una imagen en el navegador antes de subirla,
// para que la foto que se guarda en la BD sea pequeña (~30–80 KB).

export function fileToImageDataURL(
  file: File,
  max = 512,
  quality = 0.82,
): Promise<{ base64: string; mime: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen (JPG o PNG)."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width >= height && width > max) {
        height = Math.round((height * max) / width);
        width = max;
      } else if (height > max) {
        width = Math.round((width * max) / height);
        height = max;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mime = "image/jpeg";
      const dataUrl = canvas.toDataURL(mime, quality);
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ base64, mime, dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}
