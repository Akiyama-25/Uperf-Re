#!/system/bin/sh
# KernelSU Action: 优先唤起伴生 App / WebUI 界面，否则轮询切换模式
MODDIR=${0%/*}

if pm path io.github.a13e300.ksuwebui >/dev/null 2>&1; then
    am start -n io.github.a13e300.ksuwebui/.WebUIActivity -e id uperf >/dev/null 2>&1
    echo "已启动 Uperf-Re 伴生管理界面"
elif pm path com.akari.uperf >/dev/null 2>&1; then
    am start -n com.akari.uperf/.MainActivity >/dev/null 2>&1
    echo "已启动 Uperf-Re 伴生管理应用"
else
    MODE_FILE="/sdcard/Android/yc/uperf/cur_powermode.txt"
    CURRENT=$(cat "$MODE_FILE" 2>/dev/null || echo "auto")
    case "$CURRENT" in
        "auto") NEXT="powersave" ;;
        "powersave") NEXT="balance" ;;
        "balance") NEXT="performance" ;;
        "performance") NEXT="fast" ;;
        "fast") NEXT="auto" ;;
        *) NEXT="auto" ;;
    esac
    echo "$NEXT" > "$MODE_FILE"
    echo "Uperf 运行模式已切换为: $NEXT"
fi
