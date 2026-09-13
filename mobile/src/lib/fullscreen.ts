export function requestFullscreen() {
  try {
    const docEl = window.document.documentElement as any;
    const reqFs = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    if (reqFs) {
      reqFs.call(docEl).catch((err: any) => console.log("Fullscreen blocked:", err));
    }
  } catch (e) {
    // ignore
  }
}

export function exitFullscreen() {
  try {
    const doc = window.document as any;
    const exitFs = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
    if (exitFs) {
      exitFs.call(doc).catch((err: any) => console.log("Exit fullscreen blocked:", err));
    }
  } catch (e) {
    // ignore
  }
}
