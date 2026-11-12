#!/bin/bash
# Uperf-Re 本地与 CI 构建打包脚本
set -e

VERSION=$(grep -E '^version=' module.prop | cut -d'=' -f2 | tr -d ' \r\n')
VERSION=${VERSION:-"v1.51"}
DIST_DIR="dist"
PACKAGE_DIR="${DIST_DIR}/package"
MODULE_ZIP="${DIST_DIR}/Uperf-Re-${VERSION}.zip"

echo "=== 开始构建 Uperf-Re [${VERSION}] ==="

if [ "$1" == "--test" ]; then
    echo ">>> 1. 运行 Shell 脚本语法静态校验..."
    for s in $(find magisk -name "*.sh"); do
        bash -n "$s"
    done
    bash -n action.sh
    echo "[√] 所有 Shell 脚本静态语法检查通过！"
fi

if [ "$1" == "--package" ] || [ "$1" == "" ]; then
    echo ">>> 2. 准备模块打包目录结构 (${PACKAGE_DIR})..."
    rm -rf "${PACKAGE_DIR}"
    mkdir -p "${PACKAGE_DIR}"
    mkdir -p "${DIST_DIR}"
    rm -f "${MODULE_ZIP}"

    # 复制 magisk 目录下的所有模块文件至 package 目录
    cp -r magisk/* "${PACKAGE_DIR}/"

    # 确保根目录补充的 webroot / action / update.json / webui.html 等文件被完整纳入
    cp -r webroot "${PACKAGE_DIR}/"
    [ -e action.sh ] && cp action.sh "${PACKAGE_DIR}/"
    [ -e webui.html ] && cp webui.html "${PACKAGE_DIR}/"
    [ -e update.json ] && cp update.json "${PACKAGE_DIR}/"
    [ -e version.json ] && cp version.json "${PACKAGE_DIR}/"
    [ -e module.prop ] && cp module.prop "${PACKAGE_DIR}/"

    echo ">>> 3. 打包可刷入的 KernelSU / Magisk 模块压缩包..."
    python3 -c "
import zipfile, os

zip_path = '${MODULE_ZIP}'
pkg_dir = '${PACKAGE_DIR}'

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(pkg_dir):
        for f in files:
            if f.startswith('.') or f.endswith('.swp'):
                continue
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, pkg_dir)
            zf.write(full_p, rel_p)

print('Successfully created zip archive with', len(zf.namelist()), 'entries.')
"

    echo ">>> 4. 生成完整性 SHA256 校验码..."
    sha256sum "${MODULE_ZIP}" > "${MODULE_ZIP}.sha256"
    cat "${MODULE_ZIP}.sha256"
    echo ""
    echo "[√] 模块打包完成: ${MODULE_ZIP}"
    echo "[√] 散装模块目录就绪 (供给 GitHub Actions Artifact): ${PACKAGE_DIR}"
fi
