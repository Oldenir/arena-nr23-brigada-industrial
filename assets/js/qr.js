const QR_SIZE = 260;

function showQrError(target, error) {
  if (error) console.error(error);
  target.replaceChildren();
  target.classList.add("qr-error");
  target.textContent = "Não foi possível gerar o QR Code";
}

export async function renderQr(target, url) {
  if (!target || !url) return;

  try {
    if (typeof window.QRCode !== "function") {
      throw new Error("Biblioteca local de QR Code não carregada.");
    }

    target.replaceChildren();
    target.classList.remove("qr-error");

    new window.QRCode(target, {
      text: url,
      width: QR_SIZE,
      height: QR_SIZE,
      colorDark: "#111318",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel?.M
    });

    const generated = target.querySelector("canvas, img, table");
    if (!generated) throw new Error("A biblioteca local não retornou um QR Code.");
    generated.setAttribute("aria-hidden", "true");
  } catch (error) {
    showQrError(target, error);
  }
}
