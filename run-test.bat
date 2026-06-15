@echo off
echo ========================================
echo DigitalPlat API Connection Test
echo ========================================
echo.
echo 请确保你已设置环境变量:
echo   DIGITALPLAT_API_KEY
echo   DIGITALPLAT_API_SECRET
echo.
echo 或者直接在命令行提供参数:
echo   node test-digitalplat.js YOUR_API_KEY YOUR_API_SECRET
echo.
echo ========================================
echo.

set /p API_KEY="请输入 DigitalPlat API Key (留空跳过): "
set /p API_SECRET="请输入 DigitalPlat API Secret (留空跳过): "

if "%API_KEY%"=="" (
    echo.
    echo 未提供 API Key，将测试无认证的 API 端点...
    node test-digitalplat.js
) else (
    echo.
    echo 开始测试...
    node test-digitalplat.js %API_KEY% %API_SECRET%
)

pause
