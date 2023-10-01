import { h, render } from "https://unpkg.com/preact?module";
import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);

function App(props) {
  return html`
  <div>
    ${props.sysinfo.cpu_usage.map((cpu) => {
      return html`<div class="bar cpu">
        <div class="bar-inner" style="width: ${cpu}%"></div>
        <label>${cpu.toFixed(2)}%</label>
      </div>`;
    })}
  </div>
  <div>
    ${props.sysinfo.network_usage.map((network_info) => {
      return html`
      <h1>${network_info.name}</h1>
      <h2>RX</h2>
      <div class="bar iface">
        <div class="bar-inner" style="width: ${network_info.bandwidth_budget / network_info.rx_bandwidth}%"></div>
        <label>${(network_info.rx_bandwidth / 1000).toFixed(2)} Kbit/s</label>
      </div>
      <h2>TX</h2>
      <div class="bar iface">
        <div class="bar-inner" style="width: ${network_info.bandwidth_budget / network_info.tx_bandwidth}%"></div>
        <label>${(network_info.tx_bandwidth / 1000).toFixed(2)} Kbit/s</label>
      </div>
      `;
    })}
  </div>
  `;
}

{/* 
 */}

let url = new URL("/realtime/sysinfo", window.location.href);
// http => ws
// https => wss
url.protocol = url.protocol.replace("http", "ws");

let ws = new WebSocket(url.href);
ws.onmessage = (ev) => {
  let json = JSON.parse(ev.data);
  // Set a bandwidth budget that is hard-coded in bytes
  json.network_usage["bandwidth_budget"] = 1000000;  // 1Mbit/s
  // Just filter everything that's not really generating traffic
  json.network_usage = json.network_usage.filter((network_info) => network_info.rx_bytes >= 10 && network_info.tx_bytes >= 10);
  console.log(json.network_usage);
  render(html`<${App} sysinfo=${json}></${App}>`, document.body);
};
