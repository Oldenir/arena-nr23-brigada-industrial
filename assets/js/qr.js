export async function renderQr(canvas, url) {
  if (!canvas || !url) return;
  const drawFallback = () => {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    ctx.fillText("QR indisponível", 20, 100);
  };
  if (!window.QRCode?.toCanvas) {
    drawFallback();
    return;
  }
  try {
    await window.QRCode.toCanvas(canvas, url, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111318", light: "#ffffff" }
    });
  } catch {
    drawFallback();
  }
}
