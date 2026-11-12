#!/system/bin/sh
# KernelSU Action 快速切换模式脚本
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
