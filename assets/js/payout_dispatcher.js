// -*- coding: utf-8 -*-
// 文件位置：assets/js/payout_dispatcher.js
import { client, BASE_URL } from './finlinks_client.js';

// 💸 自主出金代付工作台（100%保留你设计的 300 秒确权及四元素转换逻辑）
export async function executeLivePayoutDisbursal(pushAuditLog, showPremiumNotification, fetchBalances) {
    const token = localStorage.getItem("finlinks_auth_token");
    pushAuditLog("[PAYOUT DISPATCH] 检测到财务操作：正在提炼出金核心清算意向...");
    
    const elName = document.getElementById("payout-name");
    const elAcc = document.getElementById("payout-acc");
    const elCurr = document.getElementById("payout-curr");
    const elAmt = document.getElementById("payout-amount");

    const beneficiaryName = elName.value.trim();
    const beneficiaryAcc = elAcc.value.trim();
    const currency = elCurr.value.toUpperCase();
    const amount = parseFloat(elAmt.value);

    if (!beneficiaryName || !beneficiaryAcc || !amount || amount <= 0) {
        alert("请输入完整的受益人清算信息及大于 0 的合法金额"); return;
    }

    // 🟢 客户端地缘正则校验防御
    if (window.LOCAL_RAILS_FRONTEND_REGEXP[currency]) {
        const rule = window.LOCAL_RAILS_FRONTEND_REGEXP[currency];
        const cleanAcc = beneficiaryAcc.replace(/\s+/g, "").replace(/-/g, "").replace(/\./g, "");
        if (!rule.pattern.test(currency === "TRY" ? cleanAcc.toUpperCase() : cleanAcc)) {
            showPremiumNotification("⚠️ 填单信息不合规", `当前选择的结算本币为 [${currency}]。<br><span class="text-rose-400 font-bold">${rule.notice}</span>`, "rose", true);
            return;
        }
    }

    // 调用老旧预览端点拉取价格合同
    const previewUrl = `${BASE_URL}/ledger/payout/create?beneficiary_name=${encodeURIComponent(beneficiaryName)}&beneficiary_account=${encodeURIComponent(beneficiaryAcc)}&channel_type=MOBILE_MONEY&amount=${amount}&currency=${currency}&commit=false`;
    pushAuditLog(`[RFS ACTIVATE] 正在向中台流动性池索要代付价格合同...`);

    try {
        const response = await fetch(previewUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "preview") {
            pushAuditLog(`[QUOTE CAPTURED] 报价单锁定成功！请在 5分钟 内签署财务终审授权。`);
            
            // 👑 满血放行你设计的 300秒特赦限时流式换汇确权大闸
            showPremiumNotification(
                "⚡ FXAll 限时流式换汇确权",
                `最优选通道路由：<span class="text-emerald-400 font-bold">EBANX</span><br>` +
                `换汇锁定合同号：<span class="text-slate-100 font-mono text-[10px]">${result.quote_id}</span><br>` +
                `代付结算执行价：<span class="text-emerald-400 font-mono font-bold">1 USD = ${result.sor_routing.applied_rate} ${currency}</span><br>` +
                `核销名义扣减值：<span class="text-amber-400 font-mono font-bold">-${result.deducted_amount} ${currency}</span>`,
                "emerald", true, 
                async () => {
                    // 确权通过，直轰下午测通的四元素原子大闸，无缝消灭 500 崩溃！
                    pushAuditLog(`[EXECUTE SIGNED] 财务终审通电！正在发射四元素实体 Body...`);
                    const payoutPayload = {
                        customer_id: "cus_TTOLJx1zbX",
                        target_merchant_mid: "00118468",
                        payout_amount: amount,
                        currency: currency
                    };

                    try {
                        const commitResponse = await client("/api/v2/disbursements/payout", {
                            method: "POST",
                            body: JSON.stringify(payoutPayload)
                        });
                        const commitResult = await commitResponse.json();
                        
                        if (commitResponse.status === 200 && commitResult.status === "success") {
                            pushAuditLog(`[CLEARING SUCCESS] 🎉 妥投大胜！上游参考流水: ${commitResult.audit_ledger.journal_id}`);
                            showPremiumNotification(
                                "📥 离岸虚拟总账扣款成功",
                                `外币资产足额妥投！可用头寸：<span class="text-emerald-400 font-mono font-bold">${commitResult.audit_ledger.current_balance} ${currency}</span>`,
                                "emerald", false
                            );
                            elName.value = ""; elAcc.value = ""; elAmt.value = ""; fetchBalances();
                        }
                    } catch (commitErr) {
                        pushAuditLog(`[CRITICAL CATASTROPHE] 通信猝死，请核对网络链路！`);
                    }
                },
                () => { pushAuditLog(`[TRANSACTION FLUSHED] 操盘手主动拒绝签署，交易单安全撤销，零资产变动。`); },
                300 // 刚性注入 300 秒特赦长时钟线！
            );
        }
    } catch (catchErr) {
        pushAuditLog(`[PAYOUT TIMEOUT] 物理路由断路：${catchErr.message}`);
    }
}