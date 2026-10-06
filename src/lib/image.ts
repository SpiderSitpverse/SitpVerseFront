/** Reduce una foto en el navegador (JPEG, lado máximo `maxDimension`) para que pese menos al subirla. */
export function resizeImageFile(file: File, maxDimension = 1280, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo procesar la imagen."));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo procesar la imagen."));
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") || "foto";
          resolve(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.src = url;
  });
}
