// -*- coding: utf-8 -*-
// 文件位置：C:\Users\Jacky\Desktop\my_frontend_code\assets\js\dashboard.js
// 版本说明：v5.0.0-Core-Decoupled (配置物理隔离、地缘动态分流、300s特赦时钟与原子换汇完全体)

// 🎯 【智能环境嗅探大闸】自动识别本地沙盒 vs 生产/测试云端环境
const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

const BACKEND_ENV = {
    BASE_URL: IS_LOCAL 
        ? "http://127.0.0.1:8000" 
        : "https://finlinks-backend-staging.onrender.com", 
    endpoints: {
        balances: "/ledger/balances",
        fx_quote: "/ledger/fx/quote",
        fx_convert: "/ledger/fx/convert",
        reconcile: "/ledger/reconcile",
        payin_callback: "/ledger/collection/deposit"
    }
};

// 💡 提示：静态的 FINLINKS_CURRENCY_MATRIX 与 LOCAL_RAILS_FRONTEND_REGEXP 已物理剥离至 finlinks_config.js 之中

console.log(`📡 [NETWORK ROUTING] 当前前端运行环境探测：${IS_LOCAL ? "LOCAL_SANDBOX (本地环回)" : "CLOUD_PRODUCTION (云端公网)"} | 目标中台线: ${BACKEND_ENV.BASE_URL}`);

// 🛡️ 全局金融状态大闸
let currentLiveQuoteRate = 0.00113064; 
let currentLiveQuoteTimestamp = 0;
let currentLiveRoutingVia = "PAWAPAY"; 

// ⚙️ 初始化动作：提取锁在浏览器保险柜里的 JWT 凭证并补锚自愈
document.addEventListener("DOMContentLoaded", () => {
    let token = localStorage.getItem("finlinks_auth_token");
    
    if (!token || token === "MOCK_DEVELOPER_TOKEN" || token === "admin_sandbox_pass" || !token.includes(".")) {
        console.log("⚙️ [AUTH PATCH] 检测到非标准测试令牌，正在物理注入合规沙盒 JWT 伪结构...");
        const mockHeader = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const mockPayload = btoa(JSON.stringify({ sub: "admin", exp: 2095215455 })); 
        const mockSignature = "finlinks_mock_signature_xxxxxx";
        token = `${mockHeader}.${mockPayload}.${mockSignature}`;
        localStorage.setItem("finlinks_auth_token", token);
    }
    
    // 立刻点亮高频心跳轮询
    fetchBalances();
    setInterval(fetchBalances, 4000); 

    // 🌟 动态绑定换汇输入框动作
    const amtInput = document.getElementById("sell-amount");
    if (amtInput) {
        amtInput.addEventListener("input", debounce(() => {
            triggerLiveQuote();
        }, 600)); 
    }

    // =================================================================
    // 🔌 【即插即用外挂】UI 交互地缘占位符动态联动注入器
    // =================================================================
    const payoutCurrSelect = document.getElementById("payout-curr");
    const payoutAccInput = document.getElementById("payout-acc");
    if (payoutCurrSelect && payoutAccInput) {
        payoutCurrSelect.addEventListener("change", () => {
            const chosenCurr = payoutAccInput.value ? payoutCurrSelect.value.toUpperCase().trim() : payoutCurrSelect.value.toUpperCase();
            payoutAccInput.style.transition = "all 0.3s ease";
            payoutAccInput.style.borderColor = "#f43f5e"; 
            setTimeout(() => { payoutAccInput.style.borderColor = ""; }, 400);

            switch (chosenCurr) {
                case "NGN": payoutAccInput.placeholder = "请输入 10 位尼日利亚 NUBAN 银行账号 (例如: 0123456789)"; break;
                case "KES": payoutAccInput.placeholder = "请输入肯尼亚 M-Pesa 手机号 (例如: 254712345678)"; break;
                case "UGX": payoutAccInput.placeholder = "请输入乌干达钱包账号 (例如: 256771234567)"; break;
                case "USD": payoutAccInput.placeholder = "请输入 FedWire / ACH 银行账号 (9-17位数字)"; break;
                case "BRL": payoutAccInput.placeholder = "请输入 Pix 密钥: CPF税号(11位)、CNPJ(14位)、手机号或随机 UUID"; break;
                case "MXN": payoutAccInput.placeholder = "请输入墨西哥银行标准 18 位纯数字 CLABE 统一清算编码"; break;
                case "TRY": payoutAccInput.placeholder = "请输入以 TR 开头的 26 位土耳其标准国际银行账号"; break;
                default: payoutAccInput.placeholder = "请输入收款银行账号 / 电子钱包号 (Wallet Number)";
            }
        });
    }

    const collectionCurrSelect = document.getElementById("collectionCurrency");
    const collectionPhoneInput = document.getElementById("collectionPhone");
    if (collectionCurrSelect && collectionPhoneInput) {
        collectionCurrSelect.addEventListener("change", () => {
            const chosenCurr = collectionPhoneInput.value ? collectionCurrSelect.value.toUpperCase().trim() : collectionCurrSelect.value.toUpperCase();
            collectionPhoneInput.style.transition = "all 0.3s ease";
            collectionPhoneInput.style.borderColor = "#10b981"; 
            setTimeout(() => { collectionPhoneInput.style.borderColor = ""; }, 400);

            switch (chosenCurr) {
                case "KES": collectionPhoneInput.placeholder = "东非 Safaricom 钱包号 (如: 254712345678)"; break;
                case "UGX": collectionPhoneInput.placeholder = "乌干达移动钱包号 (如: 256771234567)"; break;
                case "NGN": collectionPhoneInput.placeholder = "请输入 10 位虚拟账号或关联手机号"; break;
                case "BRL": collectionPhoneInput.placeholder = "巴西本地付款方 Pix 映射账号凭证"; break;
                case "MXN": collectionPhoneInput.placeholder = "墨西哥本地 SPEI 清算或 OXXO 关联账户"; break;
                case "TRY": collectionPhoneInput.placeholder = "土耳其本地账户号 / 电子钱包 ID"; break;
                default: collectionPhoneInput.placeholder = "请输入付款人本地账户凭证/手机号";
            }
        });
    }
});

// 🌟 【大一统功能模块】：商户多功能侧边栏无感切流分流器（SPA 机制）
function switchTab(tabId) {
    pushAuditLog(`[UI ROUTER] 正在切流至核心功能仓: ${tabId.toUpperCase()}`);
    const allPanes = document.querySelectorAll(".tab-pane");
    allPanes.forEach(pane => pane.classList.add("hidden"));
    const sidebarButtons = document.querySelectorAll("aside nav button");
    sidebarButtons.forEach(btn => btn.classList.remove("sidebar-active"));

    const targetPane = document.getElementById(`pane-${tabId}`);
    const targetBtn = document.getElementById(`btn-${tabId}`);
    if (targetPane) {
        targetPane.classList.remove("hidden");
        if (targetBtn) targetBtn.classList.add("sidebar-active");
    }
}

// 📊 动态泛化拉取多币种影子头寸
async function fetchBalances() {
    const token = localStorage.getItem("finlinks_auth_token");
    const container = document.getElementById("balances-container");
    if (!container) return; 
    
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
            const merchantTag = document.getElementById("merchant-id-tag");
            if (merchantTag) merchantTag.innerText = data.merchant;
            
            const overviewPane = document.getElementById("pane-overview");
            if (overviewPane && !overviewPane.classList.contains("hidden")) {
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
            if (data.channel_telemetry && data.channel_telemetry.length > 0) {
                data.channel_telemetry.forEach(logLine => {
                    pushAuditLog(`[ROUTE TELEMETRY] 活体穿透链路追踪: ${logLine}`);
                });
            }
        }
    } catch (error) {
        pushAuditLog(`[NETWORK ALERT] 无法叩开清算中台网关，正在执行高频动态网络容错挂起...`);
    }
}

// 🔮 自动触发跨域异步智能 SOR 实时挂流询价
async function triggerLiveQuote() {
    const token = localStorage.getItem("finlinks_auth_token");
    const sellCurr = document.getElementById("sell-currency").value;
    const buyCurr = document.getElementById("buy-currency").value;
    const sellAmt = parseFloat(document.getElementById("sell-amount").value);

    if (!sellAmt || sellAmt <= 0) return;

    // 🛡️ 询价前预检拦截：穿透 window 作用域去独立金库验证
    const sellConfig = window.FINLINKS_CURRENCY_MATRIX[sellCurr.toUpperCase()];
    const buyConfig = window.FINLINKS_CURRENCY_MATRIX[buyCurr.toUpperCase()];
    if ((sellConfig && !sellConfig.isFXEnabled) || (buyConfig && !buyConfig.isFXEnabled)) {
        return; 
    }

    try {
        const response = await fetch(`${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.fx_quote}?sell_currency=${sellCurr}&buy_currency=${buyCurr}&sell_amount=${sellAmt}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 200) {
            const quote = await response.json();
            currentLiveQuoteRate = quote.final_settlement_rate;
            currentLiveQuoteTimestamp = quote.quote_timestamp; 
            currentLiveRoutingVia = quote.routing_via; 

            const fxWidgetInfo = document.querySelector("#fx-modal .bg-slate-950");
            if (fxWidgetInfo) {
                fxWidgetInfo.innerHTML = `
                    <span class="block">SOR 实时最优询价: <span class="text-emerald-400 font-mono">1 ${sellCurr} = ${quote.final_settlement_rate} ${buyCurr}</span></span>
                    <span class="block mt-1">预计买入到账: <span class="text-slate-100 font-mono font-bold">${quote.expected_buy_amount.toLocaleString(undefined, {minimumFractionDigits: 2})} ${buyCurr}</span></span>
                    <span class="block mt-1 text-[10px] text-slate-500">点差锁定通道: ${quote.routing_via} | 10秒限时 TTL 锁价保护</span>
                `;
            }

            showPremiumNotification(
                "⚡ FXAll 换汇即期固价锁屏",
                `资产交割对：<span class="text-slate-100 font-mono font-bold">${quote.pair}</span><br>` +
                `背对背锁定通道：<span class="text-indigo-400 font-bold">${quote.routing_via}</span><br>` +
                `流式独占报价：<span class="text-emerald-400 font-mono font-bold">1 ${sellCurr} = ${quote.final_settlement_rate} ${buyCurr}</span><br>` +
                `预计换入到账：<span class="text-emerald-400 font-mono font-bold">${quote.expected_buy_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${buyCurr}</span>`,
                "emerald", true, 
                () => { submitFxConversion(quote.final_settlement_rate, quote.quote_timestamp, quote.routing_via); },
                () => { pushAuditLog(`[FX CANCELLED] 操盘手取消或 10秒未授权！即期报价作废，零敞口风险。`); },
                10 
            );
            pushAuditLog(`[FX RFS SUCCESS] 固价合同生成: ${quote.quote_id} | 渠道执行价: ${quote.final_settlement_rate}`);
        }
    } catch (error) {
        pushAuditLog(`[SOR AMBUSH ALERT] 换汇通道物理网络超时，启动风险参考防护。`);
    }
}

// 💱 提交即期外汇双边原子化换汇
async function submitFxConversion(forcedRate = null, forcedTimestamp = null, forcedRouting = null) {
    const token = localStorage.getItem("finlinks_auth_token");
    const sellCurr = document.getElementById("sell-currency").value;
    const buyCurr = document.getElementById("buy-currency").value;
    const sellAmt = parseFloat(document.getElementById("sell-amount").value);
    
    const sellConfig = window.FINLINKS_CURRENCY_MATRIX[sellCurr.toUpperCase()];
    const buyConfig = window.FINLINKS_CURRENCY_MATRIX[buyCurr.toUpperCase()];
    if ((sellConfig && !sellConfig.isFXEnabled) || (buyConfig && !buyConfig.isFXEnabled)) {
        const offendingTarget = !sellConfig.isFXEnabled ? sellCurr : buyCurr;
        console.warn(`💥 [FXALL LOCKDOWN] 换汇交割流被前端防御性强行熔断。拦截标的: ${offendingTarget}`);
        pushAuditLog(`[FX REJECTED] 风控拒签：币种 [${offendingTarget.toUpperCase()}] 暂处于流动性锁定状态 [研发中]`);
        alert(`【FinLinks 算力中枢风险提示】\n\n您选择的货币对包含未开通币种 [${offendingTarget.toUpperCase()}]。\n该区域的外汇对冲与流动性交割流目前 [功能正在研发中 / To be enabled]。`);
        return; 
    }

    const fxRate = forcedRate !== null ? forcedRate : currentLiveQuoteRate; 
    const timestamp = forcedTimestamp !== null ? forcedTimestamp : currentLiveQuoteTimestamp; 
    const routingVia = forcedRouting !== null ? forcedRouting : currentLiveRoutingVia; 

    if (!sellAmt || sellAmt <= 0) {
        alert("请输入有效的换汇结算名义金额"); return;
    }

    pushAuditLog(`[FX EXECUTE] 操作员签署确权！正在向中台发射核销电报...`);

    try {
        const url = `${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.fx_convert}?sell_currency=${sellCurr}&sell_amount=${sellAmt}&buy_currency=${buyCurr}&fx_rate=${fxRate}&quote_timestamp=${timestamp}&routing_via=${routingVia}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const result = await response.json().catch(() => ({}));

        if (response.status === 200) {
            pushAuditLog(`[SUCCESS] 跨币种原子化背对背换汇大胜！轧差批次: ${result.fx_batch_ref}`);
            showPremiumNotification(
                "🏁 外汇交割核销大捷",
                `交割详情：卖出 <span class="text-rose-400 font-mono font-bold">-${result.exchange_details.sell}</span><br>` +
                `买入到账：<span class="text-emerald-400 font-mono font-bold">+${result.exchange_details.buy}</span><br>` +
                `通道物理流水：<span class="text-slate-100 font-mono text-[11px]">${result.fx_batch_ref}</span>`,
                "emerald", false 
            );
            fetchBalances(); loadFxModal(); closeFxModal();
        } else if (response.status === 408) {
            const errorMsg = result.detail || "外汇即期锁价报价超时失效";
            pushAuditLog(`[FX TIMEOUT] ❌ 交割失败：报价确认延迟，中台已强行断路拦截！`);
            showPremiumNotification("⚠️ 外汇报价超时失效", errorMsg, "rose", true);
        } else {
            const errorMsg = result.detail || "外部清算通道突发头寸拒绝";
            pushAuditLog(`[FX MELTDOWN] 换汇中心拒绝交割: ${errorMsg}`);
            showPremiumNotification("⚠️ 换汇交割拒绝", `<span class="text-rose-400 font-bold">${errorMsg}</span>`, "rose", true);
        }
    } catch (error) {
        pushAuditLog(`[FX CRITICAL ERROR] 通信链路中断，执行紧急锁死。原因: ${error.message}`);
    }
}

// 🛡️ 触发异步三方轧差对账审计
async function triggerMockReconciliation() {
    const token = localStorage.getItem("finlinks_auth_token");
    pushAuditLog("[AUDIT START] 零信任总账对账引擎强行点火，正在追溯全量历史流水变动值...");

    try {
        const response = await fetch(`${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.reconcile}?currency=NGN`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const result = await response.json();
        pushAuditLog(`[RECON RESULT] 状态: ${result.recon_status} | 内部账目Delta: ${result.discrepancies.internal_ledger_delta} | 网关物理Delta: ${result.discrepancies.external_channel_delta}`);
        pushAuditLog(`[TELEMETRY] 遥测回执: ${result.network_telemetry}`);
    } catch (error) {
        pushAuditLog("[RECON WARNING] 跨境对账物理网络超时，对账总线启动容错暂估轧差对齐。");
    }
}

// 📥 5.0 完全体：配置驱动型动态选路泛化代收总线
async function triggerMockPayinCallback() {
    const token = localStorage.getItem("finlinks_auth_token");
    const amtEl = document.getElementById("collectionAmount");
    const currEl = document.getElementById("collectionCurrency");
    const phoneEl = document.getElementById("collectionPhone");
    const nameEl = document.getElementById("collectionPayerName");
    
    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 5000;
    const currency = currEl && currEl.value ? currEl.value.toUpperCase().trim() : "NGN";
    const phoneNumber = phoneEl && phoneEl.value ? phoneEl.value.trim() : "254712345678";
    const payerName = nameEl && nameEl.value ? nameEl.value.trim() : "Demo Payer";

    // 👑 5.0 核心机制：无损从全局配置金库中提权
    const currencyConfig = window.FINLINKS_CURRENCY_MATRIX[currency];

    if (!currencyConfig || !currencyConfig.isCollectionEnabled) {
        pushAuditLog(`[COLLECTION BLOCKED] 触发离岸清算防爆闸！拦截未通电币种: ${currency}`);
        alert(`【FinLinks 算力中枢风险提示】\n\n币种 [${currency}] 当前受限于离岸外汇管制与流动性结汇死锁，中台已关闭该通道。[功能正在研发中 / To be enabled]`);
        return;
    }

    // 🟢 【即插即用外挂拦截点】
    const cleanPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "").replace(/\./g, "");
    if (window.LOCAL_RAILS_FRONTEND_REGEXP[currency]) {
        const rule = window.LOCAL_RAILS_FRONTEND_REGEXP[currency];
        const targetVal = currency === "TRY" ? cleanPhone.toUpperCase() : cleanPhone;
        if (!rule.pattern.test(targetVal)) {
            pushAuditLog(`[PAYIN REJECTED] 客户端拦截：收单账号/手机号格式排异`);
            showPremiumNotification("⚠️ 客户端数据不合规", `该币种${rule.notice}`, "rose", true);
            return;
        }
    }

    // 🔌 【5.0 绝对解耦：地缘动态选路决策树】
    let determinedRouting = "PAWAPAY";
    if (["BRL", "TRY", "MXN"].includes(currency)) {
        determinedRouting = "EBANX";
    } else if (["NGN", "GHS"].includes(currency)) {
        determinedRouting = "FLUTTERWAVE";
    } else if (["KES", "UGX"].includes(currency)) {
        determinedRouting = "PAWAPAY";
    } else if (["USD", "EUR", "GBP", "CNY", "ZAR"].includes(currency)) {
        determinedRouting = "STRIPE"; // 提前为 Stripe 银行卡代收上电占位
    }

    pushAuditLog(`[PAYIN OUTFLOW] 正在向中台发起有源收单确权申请... 币种: ${currency} | 金额: ${amount} | 动态分流网关: ${determinedRouting}`);
    
    try {
        const url = `${BACKEND_ENV.BASE_URL}${BACKEND_ENV.endpoints.payin_callback}?amount=${amount}&currency=${currency}&phone_number=${encodeURIComponent(phoneNumber)}&payer_name=${encodeURIComponent(payerName)}&routing_via=${determinedRouting}`;
        const response = await fetch(url, { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } 
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "success") {
            pushAuditLog(`[WEBHOOK ACK] 移动货币收单受理成功！清算批次号: ${result.deposit_id}`);
            const currentWaterline = result.shadow_account_visibility.updated_balance;
            pushAuditLog(`[LEDGER UPDATED] 影子复式记账完成。${currency} 账户最新水位: ${currentWaterline}`);
            
            showPremiumNotification(
                "📥 FinLinks 离岸代收扣击成功",
                `清算参考号：<span class="text-slate-100 font-mono text-[11px]">${result.deposit_id}</span><br>` +
                `物理到账入金：<span class="text-emerald-400 font-mono font-bold">+${amount} ${currency}</span><br>` +
                `当前总账可用水线：<span class="text-indigo-400 font-mono font-bold">${currentWaterline.toLocaleString(undefined, {minimumFractionDigits: 2})} ${currency}</span>`,
                "emerald", false, () => { fetchBalances(); }
            );
        } else {
            const errorDetail = result.detail || "外部清算行网络挤压拒签";
            pushAuditLog(`[WEBHOOK DENIED] 清算报文被中台拦截: ${errorDetail}`);
            showPremiumNotification("⚠️ 收单清算熔断", errorDetail, "rose", true);
        }
    } catch (error) {
        pushAuditLog("[WEBHOOK TIMEOUT] 收单回调网关发生物理网络通信超时。");
    }
}

// =================================================================
// 💸 💸 旗舰级总线：自主出金代付工作台（300秒特赦时钟）
// =================================================================
async function executeLivePayoutDisbursal() {
    pushAuditLog("[PAYOUT DISPATCH] 检测到财务操作：正在提炼出金核心清算意向...");
    const elName = document.getElementById("payout-name");
    const elAcc = document.getElementById("payout-acc");
    const elCurr = document.getElementById("payout-curr");
    const elAmt = document.getElementById("payout-amount");

    if (!elName || !elAcc || !elCurr || !elAmt) {
        alert("系统风控：前端表单 id 错配已被拦截"); return;
    }

    const beneficiaryName = elName.value.trim();
    const beneficiaryAcc = elAcc.value.trim();
    const currency = elCurr.value.toUpperCase();
    const amount = parseFloat(elAmt.value);

    if (!beneficiaryName || !beneficiaryAcc || !amount || amount <= 0) {
        alert("请输入完整的受益人清算信息及大于 0 的合法金额"); return;
    }

    // 🟢 【即插即用外挂拦截点】
    const cleanAcc = beneficiaryAcc.replace(/\s+/g, "").replace(/-/g, "").replace(/\./g, "");
    if (window.LOCAL_RAILS_FRONTEND_REGEXP[currency]) {
        const rule = window.LOCAL_RAILS_FRONTEND_REGEXP[currency];
        const targetVal = currency === "TRY" ? cleanAcc.toUpperCase() : cleanAcc;
        if (!rule.pattern.test(targetVal)) {
            pushAuditLog(`[PAYOUT ABORTED] 客户端拦截：代付方本地卡号/钱包格式错配！`);
            showPremiumNotification("⚠️ 填单信息不合规", `当前选择的结算本币为 [${currency}]。<br><span class="text-rose-400 font-bold">${rule.notice}</span>`, "rose", true);
            return;
        }
    }

    const previewUrl = `${BACKEND_ENV.BASE_URL}/ledger/payout/create?beneficiary_name=${encodeURIComponent(beneficiaryName)}&beneficiary_account=${encodeURIComponent(beneficiaryAcc)}&channel_type=MOBILE_MONEY&amount=${amount}&currency=${currency}&commit=false`;
    pushAuditLog(`[RFS ACTIVATE] 正在向中台流动性池索要代付价格合同...`);

    try {
        const response = await fetch(previewUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("finlinks_auth_token")}`, "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "preview") {
            pushAuditLog(`[QUOTE CAPTURED] 报价单锁定成功！请在 5分钟 内签署财务终审授权。`);
            
            showPremiumNotification(
                "⚡ FXAll 限时流式换汇确权",
                `最优选通道路由：<span class="text-emerald-400 font-bold">${result.sor_routing.executed_via}</span><br>` +
                `换汇锁定合同号：<span class="text-slate-100 font-mono text-[10px]">${result.quote_id}</span><br>` +
                `代付结算执行价：<span class="text-emerald-400 font-mono font-bold">1 USD = ${result.sor_routing.applied_rate} ${currency}</span><br>` +
                `核销名义扣减值：<span class="text-amber-400 font-mono font-bold">-${result.deducted_amount} ${currency}</span>`,
                "emerald", true, 
                async () => {
                    pushAuditLog(`[EXECUTE SIGNED] 操盘手确权通电！正在携带锁价时间指纹强行击穿中台血管...`);
                    const commitUrl = `${BACKEND_ENV.BASE_URL}/ledger/payout/create?beneficiary_name=${encodeURIComponent(beneficiaryName)}&beneficiary_account=${encodeURIComponent(beneficiaryAcc)}&channel_type=MOBILE_MONEY&amount=${amount}&currency=${currency}&commit=true&quote_timestamp=${result.quote_timestamp}`;
                    
                    try {
                        const commitResponse = await fetch(commitUrl, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${localStorage.getItem("finlinks_auth_token")}`, "Content-Type": "application/json" }
                        });
                        const commitResult = await commitResponse.json();
                        
                        if (commitResponse.status === 200 && commitResult.status === "success") {
                            pushAuditLog(`[CLEARING SUCCESS] 🎉 3秒背对背对冲大胜！上游参考号: ${commitResult.payout_batch_ref}`);
                            showPremiumNotification(
                                "📥 离岸放款划转成功",
                                `物理到账回执：<span class="text-slate-100 font-mono">${commitResult.payout_batch_ref}</span><br>` +
                                `账户可用头寸：<span class="text-emerald-400 font-mono font-bold">${commitResult.remaining_balance.toLocaleString(undefined, {minimumFractionDigits: 2})} ${currency}</span>`,
                                "emerald", false
                            );
                            elName.value = ""; elAcc.value = ""; elAmt.value = ""; fetchBalances();
                        } else if (commitResponse.status === 408) {
                            pushAuditLog(`[ROUTING MELTDOWN] ❌ 核销失败：网络通信延迟超标，触发中台技术债防线！`);
                            showPremiumNotification("⚠️ 锁价执行超时", commitResult.detail, "rose", true);
                        } else {
                            pushAuditLog(`[PAYOUT DENIED] 核销被业务拦截: ${commitResult.detail}`);
                            showPremiumNotification("⚠️ 放款执行拒绝", commitResult.detail, "rose", true);
                        }
                    } catch (commitErr) {
                        pushAuditLog(`[CRITICAL CATASTROPHE] 通信猝死，请核对网络链路！`);
                    }
                },
                () => { pushAuditLog(`[TRANSACTION FLUSHED] 交易单安全关闭。意向合同原地解体，零资产变动。`); },
                300 
            );
        } else if (response.status === 400) {
            pushAuditLog(`[PAYOUT DENIED] 风控拦截: ${result.detail}`);
            showPremiumNotification("⚠️ 意向预检拒绝", result.detail, "rose", true);
        } else {
            showPremiumNotification("💥 预检阶段中台崩溃", result.detail, "rose", true);
        }
    } catch (catchErr) {
        pushAuditLog(`[PAYOUT TIMEOUT] 物理路由断路：${catchErr.message}`);
    }
}

// 🛠️ 辅助 UI 组件：免阻塞机构级黑金浮层通知窗
let finlinksLiveTtlTimer = null;
function showPremiumNotification(title, htmlContent, theme = "emerald", forceAcknowledge = false, onConfirmCallback = null, onCancelCallback = null, countdownTtl = 0) {
    if (finlinksLiveTtlTimer) { clearInterval(finlinksLiveTtlTimer); finlinksLiveTtlTimer = null; }
    const oldNotify = document.getElementById("finlinks-premium-notify"); if (oldNotify) oldNotify.remove();

    const borderClass = theme === "emerald" ? "border-emerald-500/40 shadow-emerald-950/20" : "border-rose-500/40 shadow-rose-950/20";
    const titleColor = theme === "emerald" ? "text-emerald-400" : "text-rose-400";

    window.__handlePremiumConfirm = function() {
        if (finlinksLiveTtlTimer) { clearInterval(finlinksLiveTtlTimer); finlinksLiveTtlTimer = null; }
        const el = document.getElementById("finlinks-premium-notify");
        if (el) { el.remove(); if (typeof onConfirmCallback === "function") onConfirmCallback(); }
    };

    window.__handlePremiumCancel = function() {
        if (finlinksLiveTtlTimer) { clearInterval(finlinksLiveTtlTimer); finlinksLiveTtlTimer = null; }
        const el = document.getElementById("finlinks-premium-notify");
        if (el) { el.remove(); if (typeof onCancelCallback === "function") onCancelCallback(); }
    };

    let progressLineHtml = "", buttonText = "Acknowledge";
    if (countdownTtl > 0) {
        buttonText = `Confirm (<span id="ttl-countdown-digit">${countdownTtl}</span>s)`;
        progressLineHtml = `<div class="w-full bg-slate-950 h-1 rounded-full mt-3 overflow-hidden border border-slate-800"><div id="ttl-progress-bar" class="bg-gradient-to-r from-amber-500 to-emerald-500 h-full w-full transition-all linear duration-100"></div></div>`;
    }

    const notifyHtml = `
        <div id="finlinks-premium-notify" class="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur border ${borderClass} p-5 rounded-xl shadow-2xl transition-all duration-300 transform translate-x-12 opacity-0">
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="text-sm font-extrabold ${titleColor} tracking-wide uppercase flex items-center"><span class="w-1.5 h-1.5 rounded-full ${theme === 'emerald' ? 'bg-emerald-400' : 'bg-rose-400'} inline-block mr-2 animate-pulse"></span>${title}</h4>
                    <div class="mt-2.5 text-xs text-slate-400 leading-relaxed font-sans">${htmlContent}</div>${progressLineHtml}
                </div>
                <button onclick="window.__handlePremiumCancel()" class="text-slate-500 hover:text-slate-200 transition font-mono text-xs pl-2">✕</button>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/60 flex justify-end"><button id="finlinks-payout-submit-btn" onclick="window.__handlePremiumConfirm()" class="bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded text-[10px] text-slate-200 font-bold tracking-wider transition uppercase">${buttonText}</button></div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", notifyHtml);
    const element = document.getElementById("finlinks-premium-notify");
    setTimeout(() => { if (element) element.classList.remove("translate-x-12", "opacity-0"); }, 50);

    if (countdownTtl > 0) {
        let timeLeft = countdownTtl;
        const digitEl = document.getElementById("ttl-countdown-digit"), progressBarEl = document.getElementById("ttl-progress-bar"), submitBtnEl = document.getElementById("finlinks-payout-submit-btn");
        const totalSteps = countdownTtl * 10; let currentStep = totalSteps;

        finlinksLiveTtlTimer = setInterval(() => {
            currentStep--;
            if (progressBarEl) {
                const pct = (currentStep / totalSteps) * 100; progressBarEl.style.width = `${pct}%`;
                if (pct < 40) { progressBarEl.classList.remove("from-amber-500", "to-emerald-500"); progressBarEl.classList.add("bg-rose-500"); }
            }
            if (currentStep % 10 === 0) { timeLeft--; if (digitEl && timeLeft >= 0) digitEl.innerText = timeLeft; }
            if (currentStep <= 0) {
                clearInterval(finlinksLiveTtlTimer); finlinksLiveTtlTimer = null;
                pushAuditLog(`[TTL EXPIRED] ⏳ 锁价授权超时！指令强制回滚流产。`);
                if (submitBtnEl) {
                    submitBtnEl.disabled = true; submitBtnEl.innerText = "EXPIRED";
                    submitBtnEl.className = "bg-rose-950 text-rose-500 border border-rose-900/40 px-4 py-1.5 rounded text-[10px] font-bold uppercase cursor-not-allowed";
                }
                setTimeout(() => { const el = document.getElementById("finlinks-premium-notify"); if (el) { el.classList.add("translate-x-12", "opacity-0"); setTimeout(() => { el.remove(); if (typeof onCancelCallback === "function") onCancelCallback(); }, 300); } }, 600); 
            }
        }, 100);
    } else if (!forceAcknowledge) {
        setTimeout(() => { const el = document.getElementById("finlinks-premium-notify"); if (el && !el.classList.contains("opacity-0")) { el.classList.add("translate-x-12", "opacity-0"); setTimeout(() => el.remove(), 300); } }, 8000);
    }
}

function debounce(func, delay) { let timer; return function (...args) { clearTimeout(timer); timer = setTimeout(() => func.apply(this, args), delay); }; }
function openFxModal() { const modal = document.getElementById("fx-modal"); if (modal) modal.classList.remove("pointer-events-none", "opacity-0"); }
function closeFxModal() {
    const modal = document.getElementById("fx-modal"); if (modal) {
        modal.classList.add("pointer-events-none", "opacity-0");
        const amtInput = document.getElementById("sell-amount"); if (amtInput) amtInput.value = "";
        const fxWidgetInfo = document.querySelector("#fx-modal .bg-slate-950");
        if (fxWidgetInfo) { fxWidgetInfo.innerHTML = `<span class="block text-slate-400 animate-pulse">📡 等待操盘手输入名义交割资产金额...</span>`; }
    }
}

function pushAuditLog(message) {
    const box = document.getElementById("audit-log-box");
    if (box) { const time = new Date().toLocaleTimeString(); box.innerHTML += `<div>[${time}] ${message}</div>`; box.scrollTop = box.scrollHeight; }
}
function handleLogout() { localStorage.removeItem("finlinks_auth_token"); window.location.href = "index.html"; }

// 🟢 SPA 下拉菜单选择时，动态同步地缘通道提示词的对账大闸
window.syncFXTargetVisibility = function(selectedCurrency) {
    const currencyKey = selectedCurrency.toUpperCase();
    const config = window.FINLINKS_CURRENCY_MATRIX[currencyKey];
    const badgeArea = document.getElementById("channelModeBadgeArea"), matchedMode = document.getElementById("matchedChannelMode");
    
    if (!config || !badgeArea || !matchedMode) return;
    
    badgeArea.classList.remove("hidden");
    const selectElement = document.getElementById("collectionCurrency"), selectedOption = selectElement.options[selectElement.selectedIndex];
    const rawMode = selectedOption.getAttribute("data-mode") || "未知电讯通道";
    
    if (config.isCollectionEnabled) {
        matchedMode.innerHTML = `${rawMode} <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50">已通电 (Active)</span>`;
    } else {
        matchedMode.innerHTML = `${rawMode} <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-900/50">To be enabled (研发中)</span>`;
    }
};

window.executeLivePayoutDisbursal = executeLivePayoutDisbursal;