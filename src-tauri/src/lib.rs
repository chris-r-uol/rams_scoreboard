mod ws_relay;

// The HTTP overlay server and embedded assets are only compiled into
// release builds. During `tauri dev`, Vite's dev server handles both
// the frontend on port 5173 and the WS relay on port 5199 via its plugin.
#[cfg(not(debug_assertions))]
mod http_server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            // Always start the WS relay (handles EADDRINUSE gracefully if
            // the Vite plugin also starts one during `tauri dev`)
            tauri::async_runtime::spawn(crate::ws_relay::start(5199));

            // In production, also serve the frontend on HTTP so OBS can
            // point a Browser Source at http://localhost:5173/#/overlay
            #[cfg(not(debug_assertions))]
            tauri::async_runtime::spawn(crate::http_server::start(5173));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
