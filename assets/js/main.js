/* =====================================================================
   FinLinks 2.0 异步高频数据总线与接口交互大脑
   ===================================================================== */

const CONFIG = {
    backendUrl: 'https://finlinks-backend.onrender.com/feishu/webhook', // 后端核心血管路由
    rateApi: 'https://open.er-api.com/v6/latest/USD',
    refreshInterval: 15000 // 15秒骨干网重对账频率
};

// 🎯 1. 像素级锁死：4原装基础字段表单安全投递协议
async function handleFormSubmission(event) {
    event.preventDefault();
    const msgContainer = document.getElementById('form-status-msg');
    
    // 强制原子化封装，逐字对应后端 FastAPI 接收键名
    const formData = {
        company_name: document.getElementById('company_name').value,
        contact_name: document.getElementById('contact_name').value,
        wx_email: document.getElementById('wx_email').value, 
        target_currency: document.getElementById('target_currency').value
    };

    try {
        msgContainer.innerText = '⚡ Connecting to institutional routing node...';
        msgContainer.className = 'text-center text-[11px] font-mono mt-4 text-[#00FFCC] animate-pulse';

        const response = await fetch(CONFIG.backendUrl, {
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

// 🎯 2. 高频即期牌价对账引擎 (用于 rates.html)
let globalRates = {};
let currentContinent = 'asia';

async function fetchGlobalRates(renderCallback) {
    try {
        const response = await fetch(CONFIG.rateApi);
        if (!response.ok) throw new Error('Backbone network drop');
        const data = await response.json();
        globalRates = data.rates;
        
        if (typeof renderCallback === 'function') {
            renderCallback(globalRates, currentContinent);
        }
        
        const now = new Date();
        const timerEl = document.getElementById('update-timer');
        if (timerEl) {
            timerEl.innerText = `● GRID SYNC ACTIVE | CORRELATION TIME: ${now.toLocaleTimeString()}`;
        }
    } catch (error) {
        console.error('FX API Error:', error);
        const timerEl = document.getElementById('update-timer');
        if (timerEl) {
            timerEl.innerText = '⚠️ NETWORK OBSTRUCTED - FALLBACK ROUTE ACTIVE';
        }
    }
}

// 初始化表单监听（防空指针机制）
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('finlinkForm8');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
});
