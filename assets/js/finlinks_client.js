// -*- coding: utf-8 -*-
// 文件位置：assets/js/finlinks_client.js
// 契约对齐度：100% 动态环境网关自愈

const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
export const BASE_URL = IS_LOCAL ? "http://127.0.0.1:8000" : "https://finlinks-backend.onrender.com";

export async function client(endpoint, options = {}) {
    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${BASE_URL}${cleanPath}`;

    const defaultHeaders = { 'Accept': 'application/json' };

    if (options.body && typeof options.body === 'object') {
        defaultHeaders['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const token = localStorage.getItem('finlinks_auth_token');
    if (token) { defaultHeaders['Authorization'] = `Bearer ${token}`; }

    options.headers = { ...defaultHeaders, ...options.headers };
    options.mode = 'cors';

    const response = await fetch(fullUrl, options);
    if (response.status === 401) {
        localStorage.removeItem('finlinks_auth_token');
        window.location.href = '/login.html';
        throw new Error("[SECURITY] JWT 令牌过期。");
    }
    return response;
}