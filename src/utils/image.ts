/** Redimensiona e comprime uma imagem no browser, devolvendo um data URI JPEG leve
 * o suficiente para ser guardado diretamente num documento Firestore (funciona offline,
 * sem depender de upload para Firebase Storage). */
export function comprimirImagem(file: File, larguraMaxima = 800, qualidade = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const escala = Math.min(1, larguraMaxima / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * escala
        canvas.height = img.height * escala
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', qualidade))
      }
      img.onerror = () => reject(new Error('Imagem inválida.'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'))
    reader.readAsDataURL(file)
  })
}
