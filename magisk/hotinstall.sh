#!/system/bin/sh
MODPATH=${0%/*}

# 1. 终止正在运行的旧版本 Uperf 守护进程
killall -9 uperf 2>/dev/null
sleep 1

# 2. 重新调用 service.sh 拉起新版本的 uperf 守护进程
sh "$MODPATH/service.sh" >/dev/null 2>&1 &

# 3. 伴生应用检查与自愈安装
if [ -f "$MODPATH/app/UperfManager.apk" ] && ! pm path io.github.a13e300.ksuwebui >/dev/null 2>&1 && ! pm path com.akari.uperf >/dev/null 2>&1; then
    pm install -r "$MODPATH/app/UperfManager.apk" >/dev/null 2>&1 &
fi
