#!/bin/bash
# RenewHelper 域名 API 设置脚本

set -e

echo "=========================================="
echo "  RenewHelper 域名 API 设置向导"
echo "=========================================="
echo ""

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
fi

source .env 2>/dev/null || true

echo "选择 Cloudflare API 类型："
echo "1) Global API Key"
echo "2) API Token (推荐)"
echo "3) 跳过"
read -p "请选择 [1-3]: " cf_choice

case $cf_choice in
    1)
        read -p "Cloudflare API Key: " cf_api_key
        read -p "Cloudflare Email: " cf_email
        sed -i "s/^# CF_DOMAIN_API_KEY=.*/CF_DOMAIN_API_KEY=$cf_api_key/" .env
        sed -i "s/^# CF_DOMAIN_EMAIL=.*/CF_DOMAIN_EMAIL=$cf_email/" .env
        sed -i "s/^# CF_DOMAIN_API_TYPE=.*/CF_DOMAIN_API_TYPE=global/" .env
        echo "✅ Cloudflare 配置完成"
        ;;
    2)
        read -p "Cloudflare API Token: " cf_token
        sed -i "s/^# CF_DOMAIN_API_KEY=.*/CF_DOMAIN_API_KEY=$cf_token/" .env
        sed -i "s/^# CF_DOMAIN_API_TYPE=.*/CF_DOMAIN_API_TYPE=token/" .env
        echo "✅ Cloudflare 配置完成"
        ;;
    *)
        echo "⏭️ 跳过"
        ;;
esac

read -p "是否配置 Porkbun? [y/N]: " pb_choice
if [[ $pb_choice =~ ^[Yy]$ ]]; then
    read -p "Porkbun API Key: " pb_key
    read -p "Porkbun API Secret: " pb_secret
    sed -i "s/^# PORKBUN_API_KEY=.*/PORKBUN_API_KEY=$pb_key/" .env
    sed -i "s/^# PORKBUN_API_SECRET=.*/PORKBUN_API_SECRET=$pb_secret/" .env
    echo "✅ Porkbun 配置完成"
fi

echo ""
echo "✅ 配置完成！运行 docker compose up -d 启动服务"
