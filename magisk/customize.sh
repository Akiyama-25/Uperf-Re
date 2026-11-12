SKIPUNZIP=0

# 请求免重启热安装支持
export MODULE_HOT_INSTALL_REQUEST="true"
export MODULE_HOT_RUN_SCRIPT="hotinstall.sh"

sh $MODPATH/script/setup.sh
[ "$?" != "0" ] && abort

# 同步安装轻量化伴生管理应用
if [ -f "$MODPATH/app/UperfManager.apk" ]; then
    ui_print "- 正在安装 Uperf-Re 伴生管理应用..."
    pm install -r -d "$MODPATH/app/UperfManager.apk" >/dev/null 2>&1 || true
fi
