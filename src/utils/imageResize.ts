/** Redimensiona uma imagem carregada pelo utilizador para um pequeno ícone quadrado (PNG em
 * base64), para poder ser guardada diretamente num campo do Firestore sem precisar de Storage. */
export function redimensionarImagemParaIcone(ficheiro: File, tamanho = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler o ficheiro de imagem.'))
    leitor.onload = () => {
      const imagem = new Image()
      imagem.onerror = () => reject(new Error('Ficheiro inválido: não é uma imagem reconhecível.'))
      imagem.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = tamanho
        canvas.height = tamanho
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }
        // Recorte central quadrado, para o ícone não ficar distorcido.
        const lado = Math.min(imagem.width, imagem.height)
        const origemX = (imagem.width - lado) / 2
        const origemY = (imagem.height - lado) / 2
        ctx.drawImage(imagem, origemX, origemY, lado, lado, 0, 0, tamanho, tamanho)
        resolve(canvas.toDataURL('image/png'))
      }
      imagem.src = String(leitor.result)
    }
    leitor.readAsDataURL(ficheiro)
  })
}
