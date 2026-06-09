// -*- coding: utf-8 -*-
// 文件位置：assets/js/payin_handler.js
// 🎯 FinLinks 5.2.0 完全体升级版：出海离岸收单入金专属拦截与时钟处理器

import { client } from './finlinks_client.js';

let payinTimerInterval = null; // 300秒代收专属时钟单例句柄

// 👑 【CONFIG REGEX VAULT】全盘硬核账号正则格式校验拦截金库 - 100% 留存
const RIGID_ACCOUNT_RULES = {
    "NGN": { regex: /^\d{10}$/, error: "奈拉通道校验失败：必须为 10位 纯数字 NUBAN 标准银行账号！" },
    "KES": { regex: /^(254\d{9}|0\d{9})$/, error: "肯尼亚先令校验失败：必须为标准的移动货币手机号（如254...）！" },
    "UGX": { regex: /^\d{9,12}$/, error: "乌干达先令校验失败：请输入合规的东非 Mobile Money 钱包账号！" }
};

/**
 * 📥 【积木 2 入口】：接管大厅 Pay-in 按钮点击
 */
export function handleLivePayinCallback(fetchBalances) {
    const amtEl = document.getElementById("collectionAmount");
    const currEl = document.getElementById("collectionCurrency");
    const phoneEl = document.getElementById("collectionPhone");
    const nameEl = document.getElementById("collectionPayerName");
    
    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 0;
    const currency = currEl ? currEl.value.toUpperCase().trim() : "NGN";
    const phoneNumber = phoneEl ? phoneEl.value.trim() : "";
    const payerName = nameEl && nameEl.value ? nameEl.value.trim() : "Jacky Zhang";

    if (!amount || amount <= 0 || !phoneNumber) {
        alert("请输入完整的有源收单要素及大于 0 的合规金额"); return;
    }

    // 1. 👑 物理断路拦截：触发全局正则看护
    const rule = RIGID_ACCOUNT_RULES[currency];
    if (rule && !rule.regex.test(phoneNumber)) {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[VALIDATION FAILED] ❌ ${rule.error}`);
        alert(`🚨 账户格式非法: ${rule.error}`);
        return; 
    }

    // 👑 智能化地缘渠道前置预测文案自适应
    const displayProvider = currency === "NGN" ? "FLUTTERWAVE V4 PWBT" : (["KES", "UGX"].includes(currency) ? "PAWAPAY MOMO" : "FINLINKS AGGREGATED");

    // 2. 👑 激活 HTML 基地内置的 300 秒原子级财务独占锁弹窗
    const modal = document.getElementById("payout-payin-modal");
    const titleEl = document.getElementById("order-modal-title");
    const bodyEl = document.getElementById("order-modal-body");
    const countdownText = document.getElementById("order-countdown-text");
    const progressBar = document.getElementById("order-progress-bar");
    const confirmBtn = document.getElementById("order-confirm-btn");

    if (!modal || !bodyEl) return;

    // 灌入业务审计要素数据
    titleEl.innerText = "📥 出海收单入金确权审查 (300s 财务锁)";
    bodyEl.innerHTML = `
        <div class="space-y-1 font-mono text-[11px]">
            <div>业务类型: 跨境有源收单挂账 (Pay-in Deposit)</div>
            <div>付款人全称: <span class="text-slate-100">${payerName}</span></div>
            <div>付款人账号: <span class="text-slate-100">${phoneNumber}</span></div>
            <div>拟注入水线: <span class="text-emerald-400 font-bold">+${amount.toLocaleString()} ${currency}</span></div>
            <div>中台预计路由: <span class="text-amber-400">${displayProvider}</span></div>
        </div>
    `;

    // 展现弹窗骨骼
    modal.classList.remove("opacity-0", "pointer-events-none");

    // 点火启动 300 秒高能时钟轮询
    let timeLeft = 300.0;
    if (payinTimerInterval) clearInterval(payinTimerInterval);
    
    payinTimerInterval = setInterval(() => {
        timeLeft -= 0.5;
        if (countdownText) countdownText.innerText = `${timeLeft.toFixed(1)}s`;
        if (progressBar) progressBar.style.width = `${(timeLeft / 300.0) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(payinTimerInterval);
            if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 [PAYIN TIMEOUT] 300秒确权独占锁超时失效，单据原地销毁解体！");
            closePayinModal();
        }
    }, 500);

    // 绑定具体的放行执行命令
    confirmBtn.onclick = async function() {
        clearInterval(payinTimerInterval);
        modal.classList.add("opacity-0", "pointer-events-none");
        
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN COMMIT] 操盘手签署确权令，通过 client 总线轰击中台...`);

        // 3. 👑 完美对齐后端 Query 模型，通过 client 网络总线统一安全发射
        try {
            const url = `/collection/deposit?amount=${amount}&currency=${currency}&phone_number=${encodeURIComponent(phoneNumber)}&payer_name=${encodeURIComponent(payerName)}&routing_via=${currency === 'NGN' ? 'FLUTTERWAVE' : 'PAWAPAY'}`;
            const response = await client(url, { method: "POST" });
            const result = await response.json();

            if (response.status === 200 && result.status === "success") {
                if (typeof window.pushAuditLog === "function") {
                    window.pushAuditLog(`[WEBHOOK ACK] 收单成功受理！结算批次流水号: ${result.deposit_id}`);
                }
                
                // 动态拉起大厅顶部的刷新，重新冲刷持仓可用数字（在途挂账增加）
                if (typeof fetchBalances === "function") await fetchBalances();
                
                // 👑 🎯 核心改装点：精准捕捉并提取后端驱动生成的动态虚拟打款账户特征要素
                const vBank = result.generated_bank_name || (result.raw_data && result.raw_data.account_bank_name) || "WEMA BANK";
                const vAcc = result.generated_account_number || (result.raw_data && result.raw_data.account_number);

                if (currency === "NGN" && vAcc) {
                    // 🏛️ 针对西非大厂 PWBT 模式，完美下发打款单据账单提示，破冰体验
                    alert(`🎉 跨境奈拉入金专属通道开凿成功!\n\n` +
                          `【重要提示】请提示客户立即向以下生成的专用清算账户发起转账以完成确权充值：\n` +
                          `----------------------------------------\n` +
                          `🏛️ 目标清算行: ${vBank}\n` +
                          `🎯 专属打款账号: ${vAcc}\n` +
                          `💵 需转入金额: ${amount.toLocaleString()} NGN\n` +
                          `----------------------------------------\n` +
                          `清算批次号: ${result.deposit_id}\n\n资产已注入系统在途水线（Pending Frozen），到账后持仓将自动解冻通电！`);
                } else {
                    // 传统东非移动货币回执兼容留存
                    alert(`🎉 跨境东非收单申请已成功受理!\n\n清算状态: PENDING (在途网络确权中)\n到账流水: ${result.deposit_id}\n\n资产已安全注入在途持仓矩阵，请在手机上完成 PIN 码确权放行。`);
                }
            } else {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN REJECTED] 中台拒签: ${result.detail || "未知异常"}`);
                alert(`❌ 充值申请被系统拒签: ${result.detail || "外部网关网络排异"}`);
            }
        } catch (err) {
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN CRITICAL] 物理通道通信夭折。`);
            alert(`💥 核心网络阻断：无法连接到离岸总账服务器。`);
        }
    };

    window.closeOrderModal = closePayinModal;
}

function closePayinModal() {
    if (payinTimerInterval) clearInterval(payinTimerInterval);
    const modal = document.getElementById("payout-payin-modal");
    if (modal) modal.classList.add("opacity-0", "pointer-events-none");
    if (typeof window.pushAuditLog === "function") window.pushAuditLog("[PAYIN CANCEL] 操盘手中止确权，在途入金单据安全撤销，零资产变动。");
}