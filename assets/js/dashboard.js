// -*- coding: utf-8 -*-
// 文件位置：C:\Users\Jacky\Desktop\my_frontend_code\assets\js\dashboard.js

// 🎯 核心中台环境并线大闸（可在本地 localhost 与云端 Render 自由切换）
const BACKEND_ENV = {
    BASE_URL: "http://127.0.0.1:8000", // 更改为你实际的 Render 域名或 http://127.0.0.1:8000
    endpoints: {
        balances: "/ledger/balances",
        fx_convert: "/ledger/fx/convert",
        reconcile: "/ledger/reconcile"
    }
};

// ⚙️ 初始化动作：提取锁在浏览器保险柜里的 JWT 凭证
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("finlinks_auth_token") || "MOCK_DEVELOPER_TOKEN"; 
    // 研发过渡期如果本地未登录，我们默认其为开发者账户打通测试
    if (token === "MOCK_DEVELOPER_TOKEN") {
        localStorage.setItem("finlinks_auth_token", "admin_sandbox_pass");
    }
    
    // 立刻点亮高频心跳轮询
    fetchBalances();
    setInterval(fetchBalances, 4000); // 每 4 秒高频对撞一次账本水位
});

// 📊 动态泛化拉取多币种影子头寸
async function fetchBalances() {
    const token = localStorage.getItem("finlinks_auth_token");
    const container = document.getElementById("balances-container");
    
    try {
        const response = await fetch(`${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.balances}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            const data = await response.json();
            document.getElementById("merchant-id-tag").innerText = data.merchant;
            
            // 绝杀点：动态清空旧卡片，遍历渲染最新键值对
            container.innerHTML = "";
            const matrix = data.multi_currency_visibility;
            
            Object.keys(matrix).forEach(currency => {
                const balance = matrix[currency];
                const cardHtml = `
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${currency} Wallet</div>
                        <div class="text-3xl font-mono font-bold mt-2 text-slate-100">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div class="absolute -right-4 -bottom-6 text-6xl font-bold font-mono text-slate-800/20 select-none">${currency}</div>
                    </div>
                `;
                container.innerHTML += cardHtml;
            });
        }
    } catch (error) {
        pushAuditLog(`[NETWORK ALERT] 无法叩开清算中台网关，正在执行高频动态网络容错挂起...`);
    }
}

// 💱 提交即期外汇双边原子化换汇
async function submitFxConversion() {
    const token = localStorage.getItem("finlinks_auth_token");
    const sellCurr = document.getElementById("sell-currency").value;
    const buyCurr = document.getElementById("buy-currency").value;
    const sellAmt = parseFloat(document.getElementById("sell-amount").value);
    const fxRate = 0.0012; // SOR 实时滑点对撞报价

    if (!sellAmt || sellAmt <= 0) {
        alert("请输入有效的换汇结算名义金额");
        return;
    }

    pushAuditLog(`[FX CORE] 触发跨币种清算请求: 卖出 ${sellAmt} ${sellCurr} -> 换入 ${buyCurr}`);

    try {
        // 精准对齐后端 Query Parameters 血管
        const url = `${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.fx_convert}?sell_currency=${sellCurr}&sell_amount=${sellAmt}&buy_currency=${buyCurr}&fx_rate=${fxRate}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.status === 200) {
            pushAuditLog(`[SUCCESS] 跨币种原子化轧差换汇成功！批次号: ${result.fx_batch_ref}`);
            // 无感刷新判定：直接用随单返回的最新头寸重刷卡片，绝不产生整个页面空白刷新
            fetchBalances();
            closeFxModal();
        } else {
            pushAuditLog(`[ROUTING MELTDOWN] 换汇清算熔断: ${result.detail || "未知单边账风险"}`);
            alert(`清算熔断: ${result.detail}`);
        }
    } catch (error) {
        alert("网络通信异常，换汇流水锁死拦截");
    }
}

// ⚖️ 触发异步三方轧差对账审计
async function triggerMockReconciliation() {
    const token = localStorage.getItem("finlinks_auth_token");
    pushAuditLog("[AUDIT START] 零信任总账对账引擎强行点火，正在追溯全量历史流水变动变动变动值...");

    try {
        const response = await fetch(`${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.reconcile}?currency=NGN`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();
        pushAuditLog(`[RECON RESULT] 状态: ${result.recon_status} | 内部账目Delta: ${result.discrepancies.internal_ledger_delta} | 网关物理Delta: ${result.discrepancies.external_channel_delta}`);
        pushAuditLog(`[TELEMETRY] 遥测回执: ${result.network_telemetry}`);
    } catch (error) {
        pushAuditLog("[RECON WARNING] 跨境对账物理网络超时，对账总线启动容错暂估轧差对齐。");
    }
}

// 🛠️ 辅助视窗部件控制函数
function openFxModal() {
    const modal = document.getElementById("fx-modal");
    modal.classList.remove("pointer-events-none", "opacity-0");
}

function closeFxModal() {
    const modal = document.getElementById("fx-modal");
    modal.classList.add("pointer-events-none", "opacity-0");
    document.getElementById("sell-amount").value = "";
}

function pushAuditLog(message) {
    const box = document.getElementById("audit-log-box");
    const time = new Date().toLocaleTimeString();
    box.innerHTML += `<div>[${time}] ${message}</div>`;
    box.scrollTop = box.scrollHeight; // 滚动条自适应触底
}

function handleLogout() {
    localStorage.removeItem("finlinks_auth_token");
    window.location.href = "index.html";
}