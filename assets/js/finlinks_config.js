// -*- coding: utf-8 -*-
// 文件位置：C:\Users\Jacky\Desktop\my_frontend_code\assets\js\finlinks_config.js
// 版本说明：v5.0.0-Config-Vault (全球离岸多币种硬矩阵与地缘正则风控防御金库)

(function(window) {
    'use strict';

    // 🟢 资产一：FinLinks 全球多币种外汇（FX）与收单（Collection）状态硬对账矩阵 (5.0 扩容版)
    // 未来开通新货币（如 CNY、ZAR），财务总架构师只需在此增加一行配置，主核心文件零改动！
    const FINLINKS_CURRENCY_MATRIX = {
        "KES": { name: "肯尼亚先令", isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active" },
        "UGX": { name: "乌干达先令", isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active" },
        "NGN": { name: "尼日利亚奈拉", isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active" }, 
        "BRL": { name: "巴西雷亚尔",   isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active (EBANX)" },
        "MXN": { name: "墨西哥比索",   isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active (EBANX)" },
        "TRY": { name: "土耳其里拉",   isCollectionEnabled: true,  isFXEnabled: true,  notice: "Fully Active (EBANX)" },
        // 冷库未激活储备区
        "TZS": { name: "坦桑尼亚先令", isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" },
        "GHS": { name: "加纳塞地",     isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" },
        "ZAR": { name: "南非兰特",     isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" },
        "MUR": { name: "毛里求斯卢比", isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" },
        "ARS": { name: "阿根廷比索",   isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" },
        "COP": { name: "哥伦比亚比索", isCollectionEnabled: false, isFXEnabled: false, notice: "功能正在研发中 / To be enabled" }
    };

    // 👑 资产二：客户端地缘金融正则风控拦截矩阵 (无损咬合后端 SOREngine)
    const LOCAL_RAILS_FRONTEND_REGEXP = {
        "NGN": { pattern: /^\d{10}$/, notice: "尼日利亚央行 NUBAN 规范，账号必须是且只能是 10 位纯数字" },
        "KES": { pattern: /^(254|0)?(7|1)\d{8}$/, notice: "肯尼亚 M-Pesa 规范，必须是标准的东非钱包手机号格式 (如 254712345678)" },
        "UGX": { pattern: /^(256|0)?\d{9}$/, notice: "乌干达移动货币规范，必须是标准的乌干达钱包账号/手机号" },
        "USD": { pattern: /^\d{9,17}$/, notice: "美联储清算网络规范，银行账号通常为 9 到 17 位纯数字" },
        "BRL": { pattern: /^(?:\d{11}|\d{14}|\+?55\d{10,11}|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})$/, notice: "巴西央行 Pix 规范，必须是合规的 CPF(11位)、CNPJ(14位)、手机号或标准的 UUID 随机密钥" },
        "MXN": { pattern: /^\d{18}$/, notice: "墨西哥银行标准 CLABE 规范，收款账号必须是且只能是 18 位纯数字统一清算编码" },
        "TRY": { pattern: /^TR\d{2}\d{5}[A-Z0-9]{17}$/i, notice: "土耳其中央银行 IBAN 规范，收款账号必须以 TR 开头，后跟 24 位纯数字/字母组合（总长 26 位）" }
    };

    // 🔌 显式提升挂载至顶级 window，供核心业务总线随时抓取抽血
    window.FINLINKS_CURRENCY_MATRIX = FINLINKS_CURRENCY_MATRIX;
    window.LOCAL_RAILS_FRONTEND_REGEXP = LOCAL_RAILS_FRONTEND_REGEXP;

    console.log("⚙️ [CONFIG VAULT] 全球币种硬矩阵与防爆正则金库无感挂载成功 [OK]");
})(window);