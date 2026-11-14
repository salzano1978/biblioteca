import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export default function Scanner({ onDetect }: { onDetect: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop: (() => void) | undefined;
    let done = false;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]);
    const reader = new BrowserMultiFormatReader(hints);
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, video.current!, (res) => {
        if (res && !done) {
          done = true;
          onDetect(res.getText());
        }
      })
      .then((c) => {
        stop = () => c.stop();
        if (done) c.stop();
      })
      .catch(() => setErr("Non riesco ad accedere alla fotocamera. Controlla i permessi del browser."));
    return () => stop?.();
  }, [onDetect]);

  return (
    <div className="scanner">
      <video ref={video} playsInline muted />
      <div className="aim" />
      {err && <p className="error">{err}</p>}
      <p className="hint">Inquadra il codice a barre sul retro del libro</p>
    </div>
  );
}
