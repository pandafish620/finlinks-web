/* =====================================================================
   FinLinks 2.0 异步高频数据总线与接口交互大脑（全网大一统完工版）
   ===================================================================== */

const CONFIG = {
    // 🌐 飞书表单网络血管：保持运行在 Render 上的老生产线不动
    feishuUrl: 'https://finlinks-backend.onrender.com/feishu/webhook', 
    // 📡 本地中台总线：指向本地平行的 FastAPI 数据网关
    localBackendUrl: 'http://127.0.0.1:8000'
};

// 🔑 模拟有源鉴权：放入你刚刚从 Swagger /auth/login 中 Execute 出来的最新有效 Token
// 🔒 提示：如果此钥匙再次过期导致 500/401，请用最新的有效 Token 变量值覆盖这里
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc3OTc3MzY5M30.xZNo8va_YnbPH_vGtBathItzHvQoXSDKVI35Y955zaM";

// 🎯 1. 像素级锁死：4原装基础字段表单安全投递协议 (保持飞书 crm 完好)
async function handleFormSubmission(event) {
    event.preventDefault();
    const msgContainer = document.getElementById('form-status-msg');
    if (!msgContainer) return;
    
    const formData = {
        company_name: document.getElementById('company_name').value,
        contact_name: document.getElementById('contact_name').value,
        wx_email: document.getElementById('wx_email').value, 
        target_currency: document.getElementById('target_currency').value
    };

    try {
        msgContainer.innerText = '⚡ Connecting to institutional routing node...';
        msgContainer.className = 'text-center text-[11px] font-mono mt-4 text-[#00FFCC] animate-pulse';

        const response = await fetch(CONFIG.feishuUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            msgContainer.innerText = '✓ Network Handshake Success. API Access Token Generating.';
            msgContainer.className = 'text-center text-[11px] font-mono mt-4 text-[#00FFCC] bg-[#00FFCC]/5 p-2 rounded-xl border border-[#00FFCC]/20';
            event.target.reset();
        } else {
            msgContainer.innerText = '❌ Gateway Rejected. Verification pipeline failed.';
            msgContainer.className = 'text-center text-[11px] font-mono mt-4 text-rose-500 bg-rose-950/20 p-2 rounded-xl border border-rose-900/30';
        }
    } catch (error) {
        console.error('Data pipeline error:', error);
        msgContainer.innerText = '❌ Connection Timeout. Check global grid status.';
        msgContainer.className = 'text-center text-[11px] font-mono mt-4 text-rose-500 bg-rose-950/20 p-2 rounded-xl border border-rose-900/30';
    }
}

// 🎯 2. 核心数据驱动多币种资产看板 (用于中英文 index.html 仪表盘大厅)
async function fetchAndRenderBalances() {
    const wrapper = document.getElementById("balance-cards-wrapper");
    const merchantIdLabel = document.getElementById("active-merchant-id");

    if (!wrapper) return; // 防御：如果当前页面（如 rates.html）没有资产容器，安全跳过

    const isChinese = document.documentElement.lang === "zh-CN";
    const textConfig = {
        available: isChinese ? "可用影子头寸" : "Available Shadow Position",
        clearing: isChinese ? "非托管清算托管中" : "Non-Custodial Clearing",
        error: isChinese ? "总账通信链路熔断" : "Ledger Disconnected"
    };

    try {
        const response = await fetch(`${CONFIG.localBackendUrl}/ledger/balances`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${MOCK_TOKEN}`
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.status === "success") {
            if (merchantIdLabel) merchantIdLabel.innerText = data.merchant;
            const balances = data.multi_currency_visibility;
            wrapper.innerHTML = ""; // 刷洗原有的骨架

            Object.keys(balances).forEach(currency => {
                const balanceValue = balances[currency];
                let iconClass = "fa-solid fa-money-bill-transfer text-slate-400";
                if (currency === "NGN") iconClass = "fa-solid fa-building-columns text-[#00FFCC]";
                if (currency === "USD") iconClass = "fa-solid fa-dollar-sign text-[#3b82f6]";
                if (currency === "GBP") iconClass = "fa-solid fa-sterling-sign text-purple-400";

                wrapper.innerHTML += `
                    <div class="p-6 bg-[#161a1e] rounded-xl border border-[#2b3139] hover:border-[#00FFCC]/40 transition duration-300 shadow-xl group">
                        <div class="flex items-center justify-between mb-3">
                            <div class="text-xs font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                ${currency} <span class="text-[10px] text-slate-600 font-normal">(${textConfig.available})</span>
                            </div>
                            <div class="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800">
                                <i class="${iconClass} text-xs"></i>
                            </div>
                        </div>
                        <div class="text-2xl font-black font-mono text-white tracking-tight group-hover:text-[#00FFCC] transition">
                            ${balanceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div class="mt-2 text-[9px] font-mono text-slate-500 flex items-center gap-1">
                            <i class="fa-solid fa-shield-halved text-[8px]"></i> ${textConfig.clearing}
                        </div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("❌ [BALANCES ERROR] 无法拉取复式总账头寸:", error);
        if (merchantIdLabel) merchantIdLabel.innerText = "OFFLINE";
        wrapper.innerHTML = `
            <div class="col-span-full p-6 bg-red-950/20 border border-red-900/50 rounded-xl text-center text-xs font-mono text-red-400">
                <i class="fa-solid fa-triangle-exclamation mr-2"></i> ${textConfig.error}: ${error.message}
            </div>
        `;
    }
}

// 🎯 3. 全局总线高频生命体征点火控制
document.addEventListener('DOMContentLoaded', () => {
    // 绑定飞书 CRM 提交监听
    const form = document.getElementById('finlinkForm8');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }

    // 运行并点火主页的多币种资产看板
    const balanceWrapper = document.getElementById("balance-cards-wrapper");
    if (balanceWrapper) {
        fetchAndRenderBalances();
        setInterval(fetchAndRenderBalances, 3000); // 每 3 秒在后台异步无感对账刷新一次余额
    }
});