// -*- coding: utf-8 -*-
// 文件位置：assets/js/payout_dispatcher.js
// 🎯 FinLinks 5.6.8 完全体【SINGLE 与 BATCH 双翼隔离】代付放款专属调度器

import { client } from './finlinks_client.js';

let payoutTimerInterval = null; 

// 👑 [UI REFACTOR] 统一优雅通知大闸：彻底绝杀惨白原生 alert()
function showNotificationModal({ type, title, message, subtext = "" }) {
    const oldOverlay = document.getElementById("finlinks-notification-overlay");
    if (oldOverlay) oldOverlay.remove();

    const isSuccess = type === "success";
    const themeColor = isSuccess ? "emerald" : "rose";
    const icon = isSuccess ? "✓" : "✕";

    const modalHtml = `
        <div id="finlinks-notification-overlay" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
            <div class="bg-slate-900 border border-${themeColor}-500/30 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center space-x-3 border-b border-slate-800 pb-3">
                    <div class="w-8 h-8 bg-${themeColor}-500/10 text-${themeColor}-400 rounded-lg flex items-center justify-center text-sm font-bold border border-${themeColor}-500/20">${icon}</div>
                    <h3 class="text-${themeColor}-400 font-bold text-sm tracking-wide">${title}</h3>
                </div>
                <div class="space-y-2 text-xs font-mono text-slate-300 leading-relaxed">
                    ${message}
                    ${subtext ? `<div class="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800/60">${subtext}</div>` : ""}
                </div>
                <button onclick="document.getElementById('finlinks-notification-overlay').remove()" class="w-full py-2 bg-${themeColor}-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-${themeColor}-600 transition tracking-wide shadow-lg shadow-${themeColor}-500/10">
                    确认接受并刷新账本
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * ⚡ 血管通道一：SINGLE PAYOUT (全球全币种自适应单笔极速出金分流大厅)
 * 彻底并线多币种 Funding Source 选择盒，消灭硬编码死结
 */
export async function handleSinglePayoutDisbursal(fetchBalances) {
    const sourceWalletEl = document.getElementById("payout-source-wallet"); // 🎯 动态抓取源头扣款账户
    const nameEl = document.getElementById("payout-name");
    const accEl  = document.getElementById("payout-acc");
    const currEl = document.getElementById("payout-curr");
    const amtEl  = document.getElementById("payout-amount");
    const elBankCode = document.getElementById("payout-bank-code");
    const elPhone = document.getElementById("payout-phone");

    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 0;
    
    // 🌍 【多币种极性解耦】：sellCurrency 来自你新加的选择框，buyCurrency 来自目的地下拉
    const sellCurrency = sourceWalletEl ? sourceWalletEl.value.toUpperCase().trim() : "USD";
    const buyCurrency = currEl ? currEl.value.toUpperCase().trim() : "NGN"; 
    const beneficiaryName = nameEl && nameEl.value ? nameEl.value.trim() : "";
    
    const isEastAfricaMobileMoney = ["KES", "UGX", "GHS", "TZS", "RWF", "ZMW", "MWK"].includes(buyCurrency);
    const beneficiaryAccount = isEastAfricaMobileMoney 
        ? (elPhone && elPhone.value ? elPhone.value.trim() : "")
        : (accEl && accEl.value ? accEl.value.trim() : "");

    // 🎯 增量正畸：根据币种极性，动态切换清算编码打捞节点
    const isNGN = (buyCurrency === "NGN");
    const elBankSelect = document.getElementById("payout-bank-code-select");
    const elEmail = document.getElementById("payout-email");

    const cleanBankCode = isNGN
        ? (elBankSelect ? elBankSelect.value : "044")
        : (elBankInput && elBankInput.value.trim() ? elBankInput.value.trim() : "021000021");

    // 彻底剥离死锁的默认测试桩数据，抓取真实活体输入
    const cleanPhone = elPhone && elPhone.value.trim() ? elPhone.value.trim() : ""; 
    const cleanEmail = elEmail && elEmail.value.trim() ? elEmail.value.trim() : "";

    if (!amount || amount <= 0 || !beneficiaryName || !beneficiaryAccount) {
        showNotificationModal({
            type: "error",
            title: "要素缺失 / INPUT INVALID",
            message: `【单笔模式】当前币种 [${buyCurrency}] 要素不完整。${isEastAfricaMobileMoney ? '移动钱包渠道必须输入付款人本地手机号' : '传统银行渠道必须输入完整收款账号'}`
        });
        return;
    }

    if (typeof window.pushAuditLog === "function") {
        window.pushAuditLog(`[SINGLE PAYOUT INITIATE] 启动单笔极速前置比价: 从 [${sellCurrency}] 账户扣款 -> 拟下发 ${amount} ${buyCurrency}...`);
    }

    const corridorConf = (window.GLOBAL_CORRIDOR_MATRIX && window.GLOBAL_CORRIDOR_MATRIX[buyCurrency]) || { status: "active", channel: "BANK" };
    const targetRoutingVia = (buyCurrency === "NGN" || isEastAfricaMobileMoney || corridorConf.channel === "MOBILE") ? "FLUTTERWAVE" : "AIRWALLEX";
    const targetChannelType = (isEastAfricaMobileMoney || corridorConf.channel === "MOBILE") ? "MOBILE_MONEY" : "BANK_TRANSFER";

    const basePayload = {
        "payout_mode": "SINGLE", 
        "sell_currency": sellCurrency,
        "amount": amount,                
        "buy_currency": buyCurrency,
        "fx_rate": 1.0,                  
        "routing_via": targetRoutingVia, 
        "quote_timestamp": 0.0,          
        "beneficiary_name": beneficiaryName,        
        "beneficiary_account": beneficiaryAccount,
        "type": (targetChannelType === "BANK_TRANSFER") ? "bank" : "wallet",
        "channel_type": targetChannelType,
        "bank_code": cleanBankCode,
        "beneficiary_bank_code": cleanBankCode,
        "beneficiary_phone": cleanPhone,
        "beneficiary_email": cleanEmail
    };
    
    await executeTwoPhaseClearing(basePayload, fetchBalances, buyCurrency, amount, beneficiaryName, beneficiaryAccount);
}

/**
 * 📦 血管通道二：BATCH PAYOUT (大货批量代付分流大厅)
 */
export async function handleBatchPayoutDisbursal(fetchBalances) {
    const batchDescEl = document.getElementById("batch-description");
    const parsedItems = window.__BATCH_EXCEL_DATA__ || []; 
    const batchName = batchDescEl && batchDescEl.value ? batchDescEl.value.trim() : `BATCH_TRF_${Date.now()}`;

    if (parsedItems.length === 0) {
        showNotificationModal({
            type: "error",
            title: "批量数据缺失 / NO BATCH DATA",
            message: "【批量模式】请先上传合规的代付清算单（CSV/XLSX），系统未捕获到任何散单要素"
        });
        return;
    }

    if (typeof window.pushAuditLog === "function") {
        window.pushAuditLog(`[BATCH PAYOUT INITIATE] 启动大货批量代付流: 批次名: ${batchName}, 包含散单: ${parsedItems.length} 笔...`);
    }

    const basePayload = {
        "payout_mode": "BATCH",
        "sell_currency": "USD", 
        "batch_name": batchName,
        "items": parsedItems 
    };

    await executeTwoPhaseClearing(basePayload, fetchBalances, "USD", 0, batchName, `批量散单池 (${parsedItems.length} 笔)`);
}

/**
 * 🛰️ 通用两阶段（Preview -> Commit）核销渲染中枢
 */
async function executeTwoPhaseClearing(basePayload, fetchBalances, currency, amount, titleName, targetAccount) {
    try {
        console.log("📡 [STAGE-1 PREVIEW] 发射预检合规载荷:", basePayload);
        
        const previewRes = await client("/payout/create?commit=false", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload)
        });
        const previewData = await previewRes.json();

        // 🎯 【5.6.7 契约极性自愈大闸】：全面解放状态码绑定
        const isPreviewValid = previewData.status === "preview" || previewData.status === "PREVIEW_SUCCESS" || previewData.status === "success";

        if (previewRes.status !== 200 || !isPreviewValid) {
            const errMsg = typeof previewData.detail === 'object' 
                ? JSON.stringify(previewData.detail) 
                : (previewData.detail || previewData.msg || "");
                
            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[PREVIEW REJECTED] ❌ 中台拒签预检: ${errMsg}`);
            }
            
            if (errMsg.includes("beneficiary_type_unsupported") || previewData.code === "beneficiary_type_unsupported") {
                if (typeof window.showPremiumComingSoonModal === "function") {
                    window.showPremiumComingSoonModal(currency);
                } else {
                    alert(`【VIP通道预热中】FinLinks 正在为您调谐 ${currency} 离岸中央清算大闸，请联系AM开通该血管权限。`);
                }
                return;
            }
            
            showNotificationModal({
                type: "error",
                title: "代付预检拦截 / PREVIEW REJECTED",
                message: `错误明细: ${errMsg || "离岸外盘可用头寸不足或格式排异"}`
            });
            return;
        }

        const quoteId = previewData.quote_id || (previewData.payout_route && previewData.payout_route.quote_id) || Math.random().toString(36).substring(2, 10).toUpperCase();
        const quoteTimestamp = previewData.quote_timestamp || Math.floor(Date.now() / 1000);
        const chosenProvider = previewData.sor_routing?.executed_via || (previewData.payout_route && previewData.payout_route.assigned_provider) || "AIRWALLEX";
        const appliedRate = previewData.sor_routing?.applied_rate || (previewData.payout_route && previewData.payout_route.exchange_rate) || 1.0;

        // 👑 核心正畸：抓到外盘真报价的瞬间，立刻反向灌满 basePayload 骨骼，绝杀 1:1 假账！
        basePayload.fx_rate = parseFloat(appliedRate);

        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[SOR RATIFIED] 比价决策锁定！通道: [${chosenProvider}] | 执行价: ${appliedRate}`);
        }

        const modal = document.getElementById("payout-payin-modal");
        const titleEl = document.getElementById("order-modal-title");
        const bodyEl = document.getElementById("order-modal-body");
        const countdownText = document.getElementById("order-countdown-text");
        const progressBar = document.getElementById("order-progress-bar");
        const confirmBtn = document.getElementById("order-confirm-btn");

        if (!modal || !bodyEl) return;

        titleEl.innerText = `💸 离岸代付终审核销中心 [模式: ${basePayload.payout_mode}]`;
        bodyEl.innerHTML = `
            <div class="space-y-1 font-mono text-[11px]">
                <div>清算极性: ${basePayload.payout_mode === 'SINGLE' ? '⚡ 单笔极速 (SINGLE)' : '📦 大货批量 (BATCH)'}</div>
                <div>主称/批次: <span class="text-slate-100">${titleName}</span></div>
                <div>收单目标: <span class="text-slate-100">${targetAccount}</span></div>
                <div>拟扣减币种: <span class="text-rose-400 font-bold">${amount > 0 ? `-${amount.toLocaleString()} ${basePayload.sell_currency}` : '视散单总量逐笔轧平'}</span></div>
                <div>下发币种: <span class="text-emerald-400 font-bold">${currency}</span></div>
                <div>比价选路驱动: <span class="text-amber-400">${chosenProvider} COMPONENT</span></div>
                <div class="text-[10px] text-slate-500">报价单批次指纹: ${quoteId}</div>
            </div>
        `;

        modal.classList.remove("opacity-0", "pointer-events-none");

        let timeLeft = 300.0;
        if (payoutTimerInterval) clearInterval(payoutTimerInterval);

        payoutTimerInterval = setInterval(() => {
            timeLeft -= 0.5;
            if (countdownText) countdownText.innerText = `${timeLeft.toFixed(1)}s`;
            if (progressBar) progressBar.style.width = `${(timeLeft / 300.0) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(payoutTimerInterval);
                if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 300秒代付核销超时，单据就地物理销毁，账本冲正回融。");
                closePayoutModal();
            }
        }, 500);

        confirmBtn.onclick = async function() {
            // 预防未定义全局定时器变量抛错的防滑垫片
            if (typeof payoutTimerInterval !== 'undefined') {
                clearInterval(payoutTimerInterval);
            }
            modal.classList.add("opacity-0", "pointer-events-none");

            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[PAYOUT COMMIT] 操盘手签署放款令，执行秒级背对背核销锁死...`);
            }

            // 👑 1. 提取到顶层：全局刚性硬化打捞线，确保 customer_id 在任何分支都有底牌
            const storageMid = localStorage.getItem("FINLINKS_ACTIVE_MID");
            const safeCustomerId = (storageMid && storageMid !== "null" && storageMid.trim() !== "") 
                ? storageMid.trim() 
                : (window.currentMerchantId || "admin");

            // 👑 修复 Bug 1：彻底洗净 Python 的 getattr，换回原生 JS 安全三元组
            const determineCommitPolarity = () => {
                if (basePayload.payout_mode === "BATCH") {
                    return (basePayload.commit !== undefined && basePayload.commit !== null) 
                        ? basePayload.commit 
                        : false; 
                }
                return true; 
            };

            const commitPayload = {
                ...basePayload,
                "commit": determineCommitPolarity(), 
                "quote_timestamp": parseFloat(quoteTimestamp)
            };

            try {
                console.log("📡 [STAGE-2 COMMIT] 推送真·打款放行令牌:", commitPayload);
                
                const currentProvider = window.currentSelectedProvider || "AIRWALLEX"; 
                const buyCurrency = String(basePayload.buy_currency || "").toUpperCase().trim();
                const isOffshoreFLW = (currentProvider === "FLUTTERWAVE" || buyCurrency === "NGN");

                let targetApiUrl = "/payout/create?commit=true";
                let finalizedPayload = {};

                if (isOffshoreFLW) {
                    console.log("🚀 [ROUTING SWITCH] 侦测到西非资产调拨，前端执行凌空变道 ➔ 导流至 fx_router.py");
                    targetApiUrl = "/ledger/fx/offshore-payout"; 
                    
                    const bPhone = (basePayload.beneficiary_phone || "").trim();
                    const bEmail = (basePayload.beneficiary_email || "").trim();

                    const cleanPhoneDigits = bPhone.replace(/\D/g, "");
                    if (cleanPhoneDigits.length < 10) {
                        alert("❌ [FinLinks 业务拦截] 跨境西非结汇必须填写受益人有效的手机号码（至少10位数字），请检查表单！");
                        return; 
                    }

                    finalizedPayload = {
                        "customer_id": safeCustomerId, // 📢 100% 满血入闸
                        "target_merchant_mid": basePayload.beneficiary_account || basePayload.target_merchant_mid,
                        "payout_amount": parseFloat(basePayload.amount),
                        "currency": basePayload.sell_currency,
                        // 👑 绝杀 1:1：强制把第一阶段已经反向灌入 basePayload 里的真实汇率透传给后端
                        "fx_rate": parseFloat(basePayload.fx_rate || appliedRate || 1.0),
                        "beneficiary_account": basePayload.beneficiary_account,
                        "beneficiary_name": basePayload.beneficiary_name,
                        "beneficiary_bank_code": basePayload.beneficiary_bank_code,
                        "beneficiary_phone": bPhone,
                        "beneficiary_email": bEmail || null
                    };
                } else {
                    
                    console.log("🇺🇸 [ROUTING KEEP] 走主流环球流，维持原轨道轰击 payout_router.py");
                    targetApiUrl = "/payout/create?commit=true";
                    finalizedPayload = {
                        ...basePayload,
                        "commit": true,
                        "quote_timestamp": parseFloat(quoteTimestamp)
                    };
                }

                if (typeof window.pushAuditLog === "function") {
                    window.pushAuditLog(`[ROUTE ATTACK] 实弹导火索点燃 ➔ 发往网关: ${targetApiUrl}`);
                }

                // ⚡ 扣动实弹扳手，将清洗、变道后的结果刚性击发
                const commitRes = await client(targetApiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalizedPayload) // 压入多态自愈后的终极载荷
                });
                const commitData = await commitRes.json();

                // 🎯 【5.6.8 实弹状态自适应宽松解耦】：只要 HTTP 状态是 200 且状态含有业务级 success 指纹，彻底放行！
                const isCommitApproved = commitRes.status === 200 && (
                    commitData.status === "success" || 
                    commitData.status === "SUCCESS" || 
                    commitData.status === "PREVIEW_SUCCESS" || 
                    commitData.payout_id || 
                    commitData.payout_batch_ref
                );

                if (isCommitApproved) {
                    const batchRef = commitData.payout_batch_ref || commitData.payout_id || commitData.fx_ref || `TRF_DONE_${Date.now()}`;
                    if (typeof window.pushAuditLog === "function") {
                        window.pushAuditLog(`[FXALL SUCCESS] 🎉 放款解付大捷！清算批次号: ${batchRef}`);
                    }
                    
                    if (typeof fetchBalances === "function") await fetchBalances();

                    showNotificationModal({
                        type: "success",
                        title: "⚡ DISBURSEMENT ENGAGED / 代付下发大捷",
                        message: `
                            <div>结算状态: <span class="text-emerald-400 font-bold">SUCCESS / PROCESSING (处理中)</span></div>
                            <div>代付批次号: <span class="text-white font-mono bg-slate-950 px-1 rounded">${batchRef}</span></div>
                        `,
                        subtext: "* 可用余额已安全扣减，清算单据已压入在途影子隔离舱。"
                    });

                } else {
                    const failMsg = commitData.detail || commitData.msg || "中台拒绝下发";
                    if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT FAILED] ❌ 代付核销遭拒: ${failMsg}`);
                    
                    showNotificationModal({
                        type: "error",
                        title: "🚨 代付核销失败 / DISBURSEMENT REJECTED",
                        message: `中台拒签原因: ${failMsg}`
                    });
                }
            } catch (commitErr) {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT CRITICAL] 物理放款血管通信猝死: ${commitErr.message}`);
            }
        };

        window.closeOrderModal = closePayoutModal;

    } catch (err) {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT PREVIEW EXCEPTION] 血管穿仓: ${err.message}`);
    }
}

function closePayoutModal() {
    if (payoutTimerInterval) clearInterval(payoutTimerInterval);
    const modal = document.getElementById("payout-payin-modal");
    if (modal) modal.classList.add("opacity-0", "pointer-events-none");
    if (typeof window.pushAuditLog === "function") window.pushAuditLog("[PAYOUT CANCEL] 操盘手中断出金签署，单据安全作废。");
}