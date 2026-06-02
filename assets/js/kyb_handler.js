// -*- coding: utf-8 -*-
// 文件位置：assets/js/kyb_handler.js
import { client } from './finlinks_client.js';

export async function submitAdvancedKYB(pushAuditLog, showPremiumNotification) {
    pushAuditLog("[KYB ONBOARDING] 签署确权：正在提炼高级商户资质对账血缘...");

    // 像素级对接下午大捷的松河投资咨询开户数据
    const kybPayload = {
        company_name: "Pine Bay Advisory (HK)",
        articles_of_association: "SHA256-HASH-OF-ARTICLES-OF-ASSOCIATION-999",
        ubo_name: "Jacky Xiaoyu Zhang",
        passport_or_id: "P12345678",
        company_website: "https://www.pinebayadvisory.com",
        estimated_monthly_vol: 500000.0,
        business_type_intent: "BOTH",
        fx_intent_type: "Buy FX",
        target_geopolitical_countries: ["NGN", "KES", "GB", "CN"],
        company_description: "松河投资咨询（Pine Bay Advisory）是一家资深金融咨询与流动性管理机构。"
    };

    try {
        const response = await client("/auth/onboarding/submit-detailed-kyb?email=zhangxiaoyu620@hotmail.com", {
            method: "POST",
            body: JSON.stringify(kybPayload)
        });
        
        const result = await response.json();
        if (response.status === 200) {
            pushAuditLog(`[KYB SUCCESS] 🏁 高级资质落盘！状态转换为: UNDER_REVIEW`);
            showPremiumNotification(
                "🛡️ KYB 开户归档受理大捷",
                `商户状态转换为 <span class="text-amber-400 font-bold">UNDER_REVIEW</span>，等待人工特赦。`,
                "emerald", false
            );
        }
    } catch (error) {
        pushAuditLog(`[KYB ERROR] 归档失败: ${error.message}`);
    }
}