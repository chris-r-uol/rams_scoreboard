/// WebSocket relay — mirrors the Vite plugin in vite.config.js but runs
/// in the Tauri process so it is available in both dev and production builds.
///
/// Every client that connects receives the latest cached state immediately.
/// Any state-update message received from one client is broadcast to all
/// other connected clients (the sender's store.js calls a silent set() on
/// the returned message, so there is no echo loop even though the sender
/// technically receives its own broadcast).
use futures_util::{SinkExt, StreamExt};
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

pub async fn start(port: u16) {
    let listener = match TcpListener::bind(format!("127.0.0.1:{}", port)).await {
        Ok(l) => {
            println!("[relay] WS relay listening on ws://localhost:{}", port);
            l
        }
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
            eprintln!(
                "[relay] Port {} already in use — another instance may be running.",
                port
            );
            return;
        }
        Err(e) => {
            eprintln!("[relay] Failed to bind port {}: {}", port, e);
            return;
        }
    };

    // broadcast::channel holds the latest messages for all subscribers
    let (tx, _) = broadcast::channel::<String>(256);
    let tx = Arc::new(tx);
    let latest_state: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));

    while let Ok((stream, _addr)) = listener.accept().await {
        let tx = Arc::clone(&tx);
        let latest = Arc::clone(&latest_state);

        tokio::spawn(async move {
            let ws = match accept_async(stream).await {
                Ok(ws) => ws,
                Err(_) => return,
            };

            let (mut sink, mut source) = ws.split();

            // Send the current state to the newly connected client so the
            // overlay is never blank on reconnect.
            // Clone and immediately drop the lock before the .await point.
            let maybe_state = latest.lock().unwrap().clone();
            if let Some(state) = maybe_state {
                let _ = sink.send(Message::Text(state.into())).await;
            }

            let mut rx = tx.subscribe();

            loop {
                tokio::select! {
                    msg = source.next() => {
                        match msg {
                            Some(Ok(Message::Text(text))) => {
                                *latest.lock().unwrap() = Some(text.to_string());
                                // broadcast to all subscribers (including sender)
                                let _ = tx.send(text.to_string());
                            }
                            Some(Ok(Message::Close(_))) | None => break,
                            _ => {}
                        }
                    }
                    Ok(text) = rx.recv() => {
                        if sink.send(Message::Text(text.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        });
    }
}
