import { ElNotification, ElMessageBox } from 'element-plus'

export function formatTimestamp(timestamp) {
    // 时间戳转字符串
    const date = new Date(timestamp);
    //转为中国的时区
    date.setHours(date.getHours() - 8);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function toast(message, type = 'success', position = 'top-left', dangerouslyUseHTMLString = false) {
    // 提示成功
    ElNotification({
        message,
        type,
        position,
        duration: 1000,
        showClose: true,
        dangerouslyUseHTMLString
    })
}


export function showModal(content = '提示内容', type = 'warning', title = '') {
    return ElMessageBox.confirm(
        content,
        title,
        {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: type,
        }
    )
}

import nprogress from 'nprogress'
// 显示全屏loading
export function showFullLoading() {
    nprogress.start()
}

// 隐藏全屏loading
export function hideFullLoading() {
    nprogress.done()
}
