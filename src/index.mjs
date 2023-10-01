import { h, render } from "https://unpkg.com/preact?module";
import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);
// Hardcoded here for now but should be passed via the WS connection & set via envvar optionally
const BANDWIDTH_BUDGET = 1000000.0;  // 1Mbit/s


function App(props) {
  return (
    html`
      <div>
        ${props.sysinfo.cpu_usage.map((cpu) => {
          return html`<div class="bar cpu">
            <div class="bar-inner" style="width: ${cpu}%"></div>
            <label>${cpu.toFixed(2)}%</label>
          </div>`;
        })}
      </div>
      <h2>TX/RX Budget: ${BANDWIDTH_BUDGET / 1000} Kbit/s</h2>
      <div>
        ${
          props.sysinfo.network_usage.map((network_info) => {
          return html`
          <h1>${network_info.name}</h1>
          <h2>RX</h2>
          <div class="bar iface">
            <div class="bar-inner" style="width: ${(network_info.rx_bandwidth / BANDWIDTH_BUDGET) * 100}%"></div>
            <label>${(network_info.rx_bandwidth / 1000).toFixed(2)} Kbit/s</label>
          </div>
          <h2>TX</h2>
          <div class="bar iface">
            <div class="bar-inner" style="width: ${(network_info.tx_bandwidth / BANDWIDTH_BUDGET) * 100}%"></div>
            <label>${(network_info.tx_bandwidth / 1000).toFixed(2)} Kbit/s</label>
          </div>
          `;
        })}
      </div>
  `);
}

let url = new URL("/realtime/sysinfo", window.location.href);
// http => ws
// https => wss
url.protocol = url.protocol.replace("http", "ws");

let ws = new WebSocket(url.href);
ws.onmessage = (ev) => {
  let json = JSON.parse(ev.data);
  json.network_usage["total_only"] = true;
  if (json.network_usage.total_only) {
    json.network_usage = json.network_usage.filter((network_info) => network_info.name.includes("total"));
  }
  // Just filter everything that's not really generating traffic
  // json.network_usage = json.network_usage.filter((network_info) => network_info.rx_bytes >= 10 && network_info.tx_bytes >= 10);
  render(html`<${App} sysinfo=${json}></${App}>`, document.body);
};
