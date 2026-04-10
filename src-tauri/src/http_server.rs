/// HTTP server that serves the Vite-built frontend on a real TCP port so
/// OBS Browser Source can access the overlay at http://localhost:5173/#/overlay.
///
/// This module is only compiled in release mode (`cfg(not(debug_assertions))`).
/// In dev mode, Vite's dev server already serves the frontend on port 5173.
use axum::{
    body::Body,
    http::{StatusCode, Uri, header},
    response::Response,
    Router,
};
use rust_embed::Embed;
use tokio::net::TcpListener;

/// All files under the project `dist/` folder are embedded into the
/// binary at compile time.  `dist/` is produced by `npm run build`
/// which Tauri's `beforeBuildCommand` runs automatically.
#[derive(Embed)]
#[folder = "../dist"]
struct Assets;

async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, mime.as_ref())
                .body(Body::from(content.data))
                .unwrap()
        }
        // SPA with hash routing — any unknown path falls back to index.html
        None => match Assets::get("index.html") {
            Some(content) => Response::builder()
                .header(header::CONTENT_TYPE, "text/html")
                .body(Body::from(content.data))
                .unwrap(),
            None => Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty())
                .unwrap(),
        },
    }
}

pub async fn start(port: u16) {
    let app = Router::new().fallback(static_handler);

    let listener = match TcpListener::bind(format!("127.0.0.1:{}", port)).await {
        Ok(l) => {
            println!(
                "[http] OBS overlay available at http://localhost:{}/#/overlay",
                port
            );
            l
        }
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
            eprintln!("[http] Port {} already in use.", port);
            return;
        }
        Err(e) => {
            eprintln!("[http] Failed to bind port {}: {}", port, e);
            return;
        }
    };

    axum::serve(listener, app).await.unwrap();
}
