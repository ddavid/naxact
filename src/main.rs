use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    http::Response,
    response::{Html, IntoResponse},
    routing::get,
    Router, Server,
};
use serde::{Deserialize, Serialize};
use sysinfo::{CpuExt, NetworkExt, NetworksExt, System, SystemExt};
use tokio::sync::broadcast;

#[derive(Debug, Default, Serialize, Deserialize, Clone)]

struct NetworkInfo {
    name: String,
    rx_bytes: u64,
    tx_bytes: u64,
    rx_bandwidth: f64,
    tx_bandwidth: f64,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
struct SystemSnapshot {
    cpu_usage: Vec<f32>,
    network_usage: Vec<NetworkInfo>,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel::<SystemSnapshot>(1);

    tracing_subscriber::fmt::init();

    let app_state = AppState { tx: tx.clone() };

    let router = Router::new()
        .route("/", get(root_get))
        .route("/index.mjs", get(indexmjs_get))
        .route("/index.css", get(indexcss_get))
        .route("/realtime/sysinfo", get(realtime_sysinfo_get))
        .with_state(app_state.clone());

    // Update CPU usage in the background
    tokio::task::spawn_blocking(move || {
        let mut sys = System::new();
        loop {
            sys.refresh_cpu();
            sys.refresh_networks();
            let v: Vec<_> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
            let ifaces: Vec<_> = sys
                .networks()
                .iter()
                .map(|(iface, idata)| NetworkInfo {
                    name: iface.to_owned(),
                    rx_bytes: idata.received(),
                    tx_bytes: idata.transmitted(),
                    rx_bandwidth: (idata.received() * 8) as f64 / (System::MINIMUM_CPU_UPDATE_INTERVAL.as_secs_f64()),
                    tx_bandwidth: (idata.transmitted() * 8) as f64 / (System::MINIMUM_CPU_UPDATE_INTERVAL.as_secs_f64()),
                    ..Default::default()
                })
                .collect();
            let _ = tx.send(SystemSnapshot {
                cpu_usage: v,
                network_usage: ifaces,
                ..Default::default()
            });
            std::thread::sleep(System::MINIMUM_CPU_UPDATE_INTERVAL);
        }
    });

    let server = Server::bind(&"0.0.0.0:7032".parse().unwrap()).serve(router.into_make_service());
    let addr = server.local_addr();
    println!("Listening on {addr}");

    server.await.unwrap();
}

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<SystemSnapshot>,
}

#[axum::debug_handler]
async fn root_get() -> impl IntoResponse {
    let markup = tokio::fs::read_to_string("src/index.html").await.unwrap();

    Html(markup)
}

#[axum::debug_handler]
async fn indexmjs_get() -> impl IntoResponse {
    let markup = tokio::fs::read_to_string("src/index.mjs").await.unwrap();

    Response::builder()
        .header("content-type", "application/javascript;charset=utf-8")
        .body(markup)
        .unwrap()
}

#[axum::debug_handler]
async fn indexcss_get() -> impl IntoResponse {
    let markup = tokio::fs::read_to_string("src/index.css").await.unwrap();

    Response::builder()
        .header("content-type", "text/css;charset=utf-8")
        .body(markup)
        .unwrap()
}

#[axum::debug_handler]
async fn realtime_sysinfo_get(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|ws: WebSocket| async { realtime_sysinfo_stream(state, ws).await })
}

async fn realtime_sysinfo_stream(app_state: AppState, mut ws: WebSocket) {
    let mut rx = app_state.tx.subscribe();

    while let Ok(msg) = rx.recv().await {
        ws.send(Message::Text(serde_json::to_string(&msg).unwrap()))
            .await
            .unwrap();
    }
}
