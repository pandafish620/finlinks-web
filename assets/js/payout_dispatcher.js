// -*- coding: utf-8 -*-
// 文件位置：assets/js/payout_dispatcher.js
// 🎯 FinLinks 5.2.0 乐高积木第 3 块：完全体两阶段（Preview/Commit）代付放款专属调度器

import { client } from './finlinks_client.js';

let payoutTimerInterval = null; 

// 👑 [UI REFACTOR] 统一优雅通知大闸：彻底绝杀惨白原生 alert()
function showNotificationModal({ type, title, message, subtext = "" }) {
    // 移除历史残余弹窗
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

export async function handleLivePayoutDisbursal(fetchBalances) {
    const nameEl = document.getElementById("payout-name");
    const accEl  = document.getElementById("payout-acc");
    const currEl = document.getElementById("payout-curr");
    const amtEl  = document.getElementById("payout-amount");

    const elEmail = document.getElementById("payout-email");
    const elPhone = document.getElementById("payout-phone");
    const elAddress = document.getElementById("payout-address");
    const elBankCode = document.getElementById("payout-bank-code");
    const elSwift = document.getElementById("payout-swift-code");
    const elRouting = document.getElementById("payout-routing-number");

    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 0;
    const currency = currEl ? currEl.value.toUpperCase().trim() : "NGN";
    const beneficiaryName = nameEl && nameEl.value ? nameEl.value.trim() : "";
    const beneficiaryAccount = accEl && accEl.value ? accEl.value.trim() : "";

    if (!amount || amount <= 0 || !beneficiaryName || !beneficiaryAccount) {
        showNotificationModal({
            type: "error",
            title: "要素缺失 / INPUT INVALID",
            message: "请输入完整的有源代付要素及大于 0 的合规下发金额"
        });
        return;
    }

    if (typeof window.pushAuditLog === "function") {
        window.pushAuditLog(`[PAYOUT INITIATE] 启动出金代付前置路由比价线: 拟放款 ${amount} ${currency}...`);
    }

    const cleanEmail = elEmail && elEmail.value.trim() ? elEmail.value.trim() : "jacky.xiaoyu.zhang@pinebay.io";
    const cleanPhone = elPhone && elPhone.value.trim() ? elPhone.value.trim() : "+2348012345678";
    const cleanAddress = elAddress && elAddress.value.trim() ? elAddress.value.trim() : "126 Joel Ogunnaike Street, Ikeja";
    const cleanBankCode = elBankCode && elBankCode.value.trim() ? elBankCode.value.trim() : "044";
    const cleanSwift = elSwift && elSwift.value.trim() ? elSwift.value.trim() : (currency === "NGN" ? "" : "BOFAUS3N");
    const cleanRouting = elRouting && elRouting.value.trim() ? elRouting.value.trim() : (currency === "NGN" ? "" : "021000021");

    const basePayload = {
        "sell_currency": currency.toUpperCase().trim(), 
        "sell_amount": amount,
        "buy_currency": currency.toUpperCase().trim(),  
        "fx_rate": 1.0,            
        "routing_via": "FLUTTERWAVE",
        "quote_timestamp": 0.0,
        "beneficiary_name": beneficiaryName,        
        "beneficiary_account": beneficiaryAccount,  
        "channel_type": "MOBILE_MONEY",
        "bank_code": cleanBankCode,
        "phone_number": cleanPhone
    };

    try {
        console.log("📡 [PAYOUT STAGE-1 PREVIEW] 发射预检合规载荷Body:", basePayload);
        
        const previewRes = await client("/payout/create?commit=false", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload)
        });
        const previewData = await previewRes.json();

        if (previewRes.status !== 200 || previewData.status !== "preview") {
            const errMsg = typeof previewData.detail === 'object' 
                ? JSON.stringify(previewData.detail) 
                : (previewData.detail || previewData.msg || "离岸钱包可用头寸不足或格式排异");
                
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT REJECTED] ❌ 中台拒签预检: ${errMsg}`);
            
            showNotificationModal({
                type: "error",
                title: "代付预检拦截 / PREVIEW REJECTED",
                message: `错误明细: ${errMsg}`
            });
            return;
        }

        const quoteId = previewData.quote_id || Math.random().toString(36).substring(2, 10).toUpperCase();
        const quoteTimestamp = previewData.quote_timestamp || Math.floor(Date.now() / 1000);
        const chosenProvider = previewData.sor_routing?.executed_via || "FLUTTERWAVE";
        const appliedRate = previewData.sor_routing?.applied_rate || 1.0;

        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[SOR RATIFIED] 比价引擎决策锁定！清算通道: [${chosenProvider}] | 锁定执行价: ${appliedRate}`);
        }

        const modal = document.getElementById("payout-payin-modal");
        const titleEl = document.getElementById("order-modal-title");
        const bodyEl = document.getElementById("order-modal-body");
        const countdownText = document.getElementById("order-countdown-text");
        const progressBar = document.getElementById("order-progress-bar");
        const confirmBtn = document.getElementById("order-confirm-btn");

        if (!modal || !bodyEl) return;

        titleEl.innerText = "💸 离岸代付终审核销中心 (300s 财务锁)";
        bodyEl.innerHTML = `
            <div class="space-y-1 font-mono text-[11px]">
                <div>业务类型: 自主出金代付放款 (Payout Disbursal)</div>
                <div>收款人全称: <span class="text-slate-100">${beneficiaryName}</span></div>
                <div>目标收单机构: <span class="text-slate-100">${beneficiaryAccount}</span></div>
                <div>拟扣减可用余额: <span class="text-rose-400 font-bold">-${amount.toLocaleString()} ${currency}</span></div>
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
                if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 [PAYOUT TIMEOUT] 300秒代付核销超时，单据就地物理销毁，账本冲正回融。");
                closePayoutModal();
            }
        }, 500);

        confirmBtn.onclick = async function() {
            clearInterval(payoutTimerInterval);
            modal.classList.add("opacity-0", "pointer-events-none");

            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[PAYOUT COMMIT] 操盘手签署放款令，执行秒级背对背核销锁死...`);
            }

            const commitPayload = {
                ...basePayload,
                "quote_timestamp": parseFloat(quoteTimestamp)
            };

            try {
                console.log("📡 [PAYOUT STAGE-2 COMMIT] 正在向中台推送真·打款放行令牌Body:", commitPayload);
                
                const commitRes = await client("/payout/create?commit=true", { 
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(commitPayload)
                });
                const commitData = await commitRes.json();

                if (commitRes.status === 200 && (commitData.status === "success" || commitData.status === "SUCCESS")) {
                    const batchRef = commitData.payout_batch_ref || commitData.fx_ref || "TRF_UNKNOWN";
                    if (typeof window.pushAuditLog === "function") {
                        window.pushAuditLog(`[FXALL SUCCESS] 🎉 放款解付大捷！清算批次号: ${batchRef}`);
                    }
                    
                    if (typeof fetchBalances === "function") await fetchBalances();

                    // 👑 替换点 1：全暗黑优雅解付模态框
                    showNotificationModal({
                        type: "success",
                        title: "⚡ DISBURSEMENT ENGAGED / 代付下发大捷",
                        message: `
                            <div>结算状态: <span class="text-amber-400 font-bold">PROCESSING (处理中)</span></div>
                            <div>代付批次号: <span class="text-white font-mono bg-slate-950 px-1 rounded">${batchRef}</span></div>
                        `,
                        subtext: "* 可用余额已安全扣减，清算单据已压入在途影子隔离舱。"
                    });

                } else {
                    const failMsg = commitData.detail || commitData.msg || "中台拒绝下发";
                    if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT FAILED] ❌ 代付核销遭拒: ${failMsg}`);
                    
                    // 👑 替换点 2：优雅错误阻断
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
    if (typeof window.pushAuditLog === "function") window.pushAuditLog("[PAYOUT CANCEL] 操盘手中断出金签署，代付单据安全做废，可用余额无损。");
}