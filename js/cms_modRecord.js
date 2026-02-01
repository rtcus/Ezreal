// 修撤单记录管理模块
let modRecordCurrentPage = 1;
let modRecordPageSize = 50;
let modRecordTotalCount = 0;
let modRecordData = [];
let modRecordEventsBound = false; // 标记是否已绑定事件

// 页面初始化函数
function initModRecordPage() {
    console.log('初始化修撤单记录管理页面...');
    
    // 检查LeanCloud是否初始化
    if (!AV.applicationId) {
        console.error('LeanCloud未初始化，无法加载数据');
        showMessage('数据库连接未初始化，请刷新页面重试', 'error');
        return;
    }
    
    // 检查必要的元素是否存在
    if (!document.getElementById('searchModRecord')) {
        console.error('修撤单记录管理页面元素不存在');
        return;
    }
    
    console.log('开始绑定事件...');
    bindModRecordEvents();
    
    // 延迟初始化列宽调整功能，避免影响数据显示
    setTimeout(() => {
        console.log('初始化列宽调整功能...');
        try {
            initResizableColumns();
            // 重置列宽到合适宽度
            resetColumnWidths();
        } catch (error) {
            console.error('列宽调整功能初始化失败:', error);
        }
    }, 500);
    
    console.log('开始加载数据...');
    loadModRecordData();
}

// 绑定事件 - 使用事件委托避免重复绑定
function bindModRecordEvents() {
    try {
        console.log('绑定修撤单记录管理事件（使用事件委托）...');

        // 不再使用克隆节点的方式清除事件监听器
        // 改为直接使用事件委托，避免重复绑定

        // 使用事件委托，只绑定一次到页面容器
        const container = document.getElementById('modRecord');

        // 检查是否已经绑定过事件
        if (modRecordEventsBound && container) {
            console.log('事件已绑定，跳过重复绑定');
            return;
        }

        if (!container) {
            console.error('找不到 modRecord 容器');
            return;
        }

        // 查询按钮
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'searchModRecord') {
                console.log('查询按钮被点击');
                modRecordCurrentPage = 1;
                loadModRecordData();
            }
        });

        // 清空按钮
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'clearModRecord') {
                console.log('清空按钮被点击');
                clearModRecordSearch();
            }
        });

        // 新增按钮
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'addModRecord') {
                console.log('新增按钮被点击');
                showAddModRecordModal();
            }
        });

        // 导入按钮
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'importModRecord') {
                console.log('导入按钮被点击');
                showImportModal();
            }
        });

        // 导出按钮现在使用onclick属性，不再通过事件委托绑定

        // 每页显示数量变化
        container.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'modRecordPageSizeSelect') {
                console.log('页面大小改变:', e.target.value);
                modRecordPageSize = parseInt(e.target.value);
                modRecordCurrentPage = 1;
                loadModRecordData();
            }
        });

        // 保存新增记录 - 绑定到整个document确保模态框也能触发
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'modalModRecordSaveBtn') {
                console.log('保存新增记录按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                saveModRecord();
            }
        });

        // 保存编辑记录现在使用onclick属性，不再通过事件委托绑定

        // 开始导入
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'startImportBtn') {
                console.log('开始导入按钮被点击');
                startImport();
            }
        });

        // 重置列宽
        container.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'resetColumnWidths') {
                console.log('重置列宽按钮被点击');
                resetColumnWidths();
            }
        });

        // 日期选择器
        if (document.getElementById('modOperationDate')) {
            flatpickr('#modOperationDate', {
                dateFormat: "Y-m-d",
                locale: "zh",
                defaultDate: new Date(),
                allowInput: true
            });
        }

        // 编辑模态框的日期选择器
        if (document.getElementById('editModOperationDate')) {
            flatpickr('#editModOperationDate', {
                dateFormat: "Y-m-d",
                locale: "zh",
                allowInput: true
            });
        }

        modRecordEventsBound = true;
        console.log('事件委托绑定完成');

    } catch (error) {
        console.error('绑定修撤单记录管理事件失败:', error);
    }
}

// 清空查询条件
function clearModRecordSearch() {
    document.getElementById('declarationNoSearch').value = '';
    document.getElementById('containerNoSearch').value = '';
    modRecordCurrentPage = 1;
    loadModRecordData();
}

// 加载修撤单记录数据
async function loadModRecordData() {
    try {
        console.log('开始加载修撤单记录数据...');
        showModRecordLoading(true);
        
        const declarationNo = document.getElementById('declarationNoSearch').value.trim();
        const containerNo = document.getElementById('containerNoSearch').value.trim();
        
        // 先检查 LeanCloud 连接
        console.log('检查LeanCloud连接状态...');
        if (!AV.applicationId) {
            throw new Error('LeanCloud未正确初始化');
        }
        
        // 构建查询条件
        console.log('构建查询条件...');
        const query = new AV.Query('cus_mod');
        
        // 添加查询条件
        if (declarationNo) {
            query.contains('declarationNo', declarationNo);
            console.log('添加报关单编号查询条件:', declarationNo);
        }
        
        if (containerNo) {
            query.contains('containerNo', containerNo);
            console.log('添加柜号查询条件:', containerNo);
        }
        
        // 按操作日期升序排序
        query.ascending('operationDate');
        
        // 获取总数 - 重新创建查询来获取总数
        console.log('查询数据总数...');
        const countQuery = new AV.Query('cus_mod');
        if (declarationNo) {
            countQuery.contains('declarationNo', declarationNo);
        }
        if (containerNo) {
            countQuery.contains('containerNo', containerNo);
        }
        modRecordTotalCount = await countQuery.count();
        console.log('查询到数据条数:', modRecordTotalCount);
        
        // 分页查询
        console.log('开始分页查询...');
        query.limit(modRecordPageSize);
        query.skip((modRecordCurrentPage - 1) * modRecordPageSize);
        
        const results = await query.find();
        modRecordData = results.map(item => item.toJSON());
        console.log('获取到数据:', modRecordData.length, '条');
        
        if (modRecordData.length > 0) {
            console.log('第一条数据样本:', modRecordData[0]);
        }
        
        console.log('开始渲染表格...');
        renderModRecordTable();
        console.log('开始渲染分页...');
        renderModRecordPagination();
        console.log('数据加载完成');
        
    } catch (error) {
        console.error('加载修撤单记录数据失败:', error);
        showMessage('加载数据失败: ' + error.message, 'error');
        
        // 在出错时也要尝试渲染空表格
        modRecordData = [];
        renderModRecordTable();
        renderModRecordPagination();
    } finally {
        showModRecordLoading(false);
    }
}

// 渲染表格
function renderModRecordTable() {
    const tbody = document.getElementById('modRecordBody');
    
    console.log('渲染表格，数据条数:', modRecordData.length);
    
    if (!modRecordData || modRecordData.length === 0) {
        console.log('没有数据，显示暂无数据');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-muted">
                    <i class="fas fa-database me-2"></i>暂无数据
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('开始渲染表格行...');
    const html = modRecordData.map((item, index) => {
        const serialNumber = (modRecordCurrentPage - 1) * modRecordPageSize + index + 1;
        const operationDate = item.operationDate || '';
        
        console.log(`渲染第${index + 1}行数据:`, item);
        
        return `
            <tr>
                <td class="text-center">${serialNumber}</td>
                <td>${escapeHtml(item.applicationNo || '')}</td>
                <td>${escapeHtml(item.declarationUnit || '')}</td>
                <td>${escapeHtml(item.consigneeName || '')}</td>
                <td>${escapeHtml(item.declarationNo || '')}</td>
                <td>${escapeHtml(item.containerNo || '')}</td>
                <td class="text-center">${operationDate}</td>
                <td>${escapeHtml(item.reason || '')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary me-1" onclick="editModRecord('${item.objectId}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteModRecord('${item.objectId}', '${escapeHtml(item.applicationNo || '')}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('表格HTML生成完成，设置到tbody');
    tbody.innerHTML = html;
    console.log('表格渲染完成');
}

// 渲染分页
function renderModRecordPagination() {
    const totalPages = Math.ceil(modRecordTotalCount / modRecordPageSize);
    const pagination = document.getElementById('modRecordPagination');
    const paginationInfo = document.getElementById('modRecordPaginationInfo');
    
    console.log('渲染分页信息:', { modRecordTotalCount, modRecordPageSize, modRecordCurrentPage, totalPages });
    
    // 更新分页信息
    if (paginationInfo) {
        paginationInfo.textContent = `共 ${modRecordTotalCount} 条记录`;
    } else {
        console.error('找不到分页信息元素 modRecordPaginationInfo');
    }
    
    if (!pagination) {
        console.error('找不到分页元素 modRecordPagination');
        return;
    }
    
    let paginationHtml = '';
    
    // 上一页
    paginationHtml += `
        <li class="page-item ${modRecordCurrentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${modRecordCurrentPage - 1}">上一页</a>
        </li>
    `;
    
    // 页码
    const startPage = Math.max(1, modRecordCurrentPage - 2);
    const endPage = Math.min(totalPages, modRecordCurrentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <li class="page-item ${i === modRecordCurrentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // 下一页
    paginationHtml += `
        <li class="page-item ${modRecordCurrentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${modRecordCurrentPage + 1}">下一页</a>
        </li>
    `;
    
    pagination.innerHTML = paginationHtml;
    
    // 绑定分页点击事件
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page > 0 && page <= totalPages && page !== modRecordCurrentPage) {
                modRecordCurrentPage = page;
                loadModRecordData();
            }
        });
    });
    
    console.log('分页渲染完成');
}

// 显示新增模态框
function showAddModRecordModal() {
    const modal = new bootstrap.Modal(document.getElementById('addModRecordModal'));
    
    // 清空表单
    document.getElementById('addModRecordForm').reset();
    
    // 设置默认日期
    const today = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    document.getElementById('modOperationDate').value = today;
    
    modal.show();
}

// 保存修撤记录
async function saveModRecord() {
    const form = document.getElementById('addModRecordForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = {
        applicationNo: document.getElementById('modApplicationNo').value.trim(),
        declarationUnit: document.getElementById('modDeclarationUnit').value.trim(),
        consigneeName: document.getElementById('modConsigneeName').value.trim(),
        declarationNo: document.getElementById('modDeclarationNo').value.trim(),
        containerNo: document.getElementById('modContainerNo').value.trim(),
        operationDate: document.getElementById('modOperationDate').value,
        reason: document.getElementById('modReason').value.trim()
    };
    
    try {
        // 检查申请单编号是否重复
        const checkQuery = new AV.Query('cus_mod');
        checkQuery.equalTo('applicationNo', data.applicationNo);
        const existing = await checkQuery.first();
        
        if (existing) {
            showMessage('修撤申请单编号已存在', 'error');
            return;
        }
        
        // 创建新记录
        const modRecord = new AV.Object('cus_mod');
        Object.keys(data).forEach(key => {
            modRecord.set(key, data[key]);
        });
        
        await modRecord.save();
        
        showMessage('修撤记录添加成功', 'success');
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('addModRecordModal'));
        modal.hide();
        
        // 重新加载数据
        loadModRecordData();
        
    } catch (error) {
        console.error('保存修撤记录失败:', error);
        showMessage('保存失败: ' + error.message, 'error');
    }
}

// 显示导入模态框
function showImportModal() {
    const modal = new bootstrap.Modal(document.getElementById('importModRecordModal'));
    
    // 清空文件输入
    document.getElementById('importFile').value = '';
    document.getElementById('importProgress').style.display = 'none';
    
    modal.show();
}

// 开始导入
async function startImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('请选择要导入的文件', 'error');
        return;
    }
    
    try {
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            showMessage('文件中没有有效数据', 'error');
            return;
        }
        
        // 显示进度条
        const progressDiv = document.getElementById('importProgress');
        const progressBar = progressDiv.querySelector('.progress-bar');
        progressDiv.style.display = 'block';
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // 验证必填字段
                if (!row['修撤申请单编号'] || !row['申报单位'] || 
                    !row['境内收发货人名称'] || !row['报关单编号'] || 
                    !row['操作日期'] || !row['修撤原因']) {
                    failCount++;
                    continue;
                }
                
                // 检查重复
                const checkQuery = new AV.Query('cus_mod');
                checkQuery.equalTo('applicationNo', row['修撤申请单编号']);
                const existing = await checkQuery.first();
                
                if (existing) {
                    failCount++;
                    continue;
                }
                
                // 创建记录
                const modRecord = new AV.Object('cus_mod');
                modRecord.set('applicationNo', String(row['修撤申请单编号'] || ''));
                modRecord.set('declarationUnit', String(row['申报单位'] || ''));
                modRecord.set('consigneeName', String(row['境内收发货人名称'] || ''));
                modRecord.set('declarationNo', String(row['报关单编号'] || ''));
                modRecord.set('containerNo', String(row['柜号'] || ''));
                
                // 处理日期
                let operationDate;
                const dateValue = row['操作日期'];
                
                try {
                    if (typeof dateValue === 'number') {
                        // Excel日期数字转换 - 使用UTC避免时区问题
                        const excelDate = new Date((dateValue - 25569) * 86400000);
                        operationDate = new Date(Date.UTC(
                            excelDate.getFullYear(),
                            excelDate.getMonth(),
                            excelDate.getDate()
                        ));
                    } else if (typeof dateValue === 'string') {
                        // 字符串日期处理
                        // 尝试多种日期格式
                        const dateStr = dateValue.trim();
                        if (dateStr.includes('-')) {
                            // 添加时间部分避免时区偏移
                            operationDate = new Date(dateStr + 'T12:00:00Z');
                        } else if (dateStr.includes('/')) {
                        // 处理 2025/6/5 格式
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            // 确保月份和日都是两位数
                            const year = parts[0];
                            const month = parts[1].padStart(2, '0');
                            const day = parts[2].padStart(2, '0');
                            
                            // 使用UTC时间避免时区问题
                            const utcDate = new Date(`${year}-${month}-${day}T12:00:00Z`);
                            operationDate = utcDate;
                        } else {
                            // 添加时间部分避免时区偏移
                            const formattedDate = dateStr.replace(/\//g, '-') + 'T12:00:00Z';
                            operationDate = new Date(formattedDate);
                        }
                        } else {
                            operationDate = new Date(dateStr);
                        }
                    } else if (dateValue instanceof Date) {
                        operationDate = dateValue;
                    } else {
                        operationDate = new Date(dateValue);
                    }
                    
                    // 验证日期是否有效
                    if (isNaN(operationDate.getTime())) {
                        console.error('无效的日期格式:', dateValue);
                        failCount++;
                        continue;
                    }
                    
                    // 设置时间为当天的开始，避免时区问题
                    operationDate.setHours(0, 0, 0, 0);
                    
                } catch (error) {
                    console.error('日期处理错误:', error, dateValue);
                    failCount++;
                    continue;
                }
                
                // 使用本地时间格式化日期，避免UTC时区偏移
                const year = operationDate.getFullYear();
                const month = String(operationDate.getMonth() + 1).padStart(2, '0');
                const day = String(operationDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                modRecord.set('operationDate', dateString);
                modRecord.set('reason', String(row['修撤原因'] || ''));
                
                await modRecord.save();
                successCount++;
                
            } catch (error) {
                console.error('导入第' + (i + 1) + '行数据失败:', error);
                failCount++;
            }
            
            // 更新进度条
            const progress = ((i + 1) / data.length) * 100;
            progressBar.style.width = progress + '%';
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('importModRecordModal'));
        modal.hide();
        
        // 显示导入结果
        let message = `导入完成！成功 ${successCount} 条`;
        if (failCount > 0) {
            message += `，失败 ${failCount} 条`;
        }
        showMessage(message, successCount > 0 ? 'success' : 'error');
        
        // 重新加载数据
        loadModRecordData();
        
    } catch (error) {
        console.error('导入失败:', error);
        showMessage('导入失败: ' + error.message, 'error');
    }
}

// 处理导出点击事件
function handleExportClick(event) {
    console.log('导出按钮被点击');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // 阻止任何可能的默认行为
    try {
        event.returnValue = false;
        if (event.cancelBubble !== undefined) {
            event.cancelBubble = true;
        }
    } catch (e) {
        // 忽略错误
    }
    
    // 使用 try-catch 包装，确保任何错误都不会导致页面刷新
    try {
        exportModRecordData();
    } catch (error) {
        console.error('导出过程中发生错误:', error);
        showMessage('导出失败: ' + error.message, 'error');
    }
    
    return false;
}

// 导出数据 - 添加防抖机制
let isExporting = false;
async function exportModRecordData() {
    // 防抖检查
    if (isExporting) {
        console.log('正在导出中，忽略重复调用');
        return;
    }
    
    try {
        isExporting = true;
        console.log('开始导出数据...');
        
        const declarationNo = document.getElementById('declarationNoSearch').value.trim();
        const containerNo = document.getElementById('containerNoSearch').value.trim();
        
        // 构建查询条件
        const query = new AV.Query('cus_mod');
        
        if (declarationNo) {
            query.contains('declarationNo', declarationNo);
        }
        
        if (containerNo) {
            query.contains('containerNo', containerNo);
        }
        
        query.ascending('operationDate');
        query.limit(10000); // 限制导出数量
        
        console.log('查询数据中...');
        const results = await query.find();
        console.log('查询到数据:', results.length, '条');
        
        const exportData = results.map(item => {
            const data = item.toJSON();
            return {
                '序号': '',
                '修撤申请单编号': data.applicationNo || '',
                '申报单位': data.declarationUnit || '',
                '境内收发货人名称': data.consigneeName || '',
                '报关单编号': data.declarationNo || '',
                '柜号': data.containerNo || '',
                '操作日期': data.operationDate ? 
                    new Date(data.operationDate).toLocaleDateString('zh-CN') : '',
                '修撤原因': data.reason || ''
            };
        });
        
        // 添加序号
        exportData.forEach((item, index) => {
            item['序号'] = index + 1;
        });
        
        if (exportData.length === 0) {
            showMessage('没有数据可导出', 'error');
            return;
        }
        
        console.log('开始生成Excel文件...');
        // 导出为Excel
        await exportToExcel(exportData, '修撤单记录数据');
        showMessage('导出成功', 'success');
        
    } catch (error) {
        console.error('导出失败:', error);
        showMessage('导出失败: ' + error.message, 'error');
    } finally {
        // 延迟重置防抖标记
        setTimeout(() => {
            isExporting = false;
        }, 2000);
    }
}

// 显示加载状态
function showModRecordLoading(show) {
    const tbody = document.getElementById('modRecordBody');
    if (show) {
        console.log('显示加载状态...');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="loading-container">
                        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                        加载中...
                    </div>
                </td>
            </tr>
        `;
    } else {
        console.log('隐藏加载状态，将交由表格渲染函数处理');
    }
}

// HTML转义
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 读取Excel文件
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 导出为Excel - 使用更安全的方法（异步）
async function exportToExcel(data, fileName) {
    try {
        console.log('开始生成Excel文件...');
        
        // 创建工作簿和工作表
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        
        // 生成文件名
        const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        const fullFileName = fileName + '_' + timestamp + '.xlsx';
        
        console.log('准备写入文件:', fullFileName);
        
        // 使用 XLSX.write 生成二进制数据，然后手动创建下载链接
        const excelBuffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
        
        // 创建 Blob 对象
        const blob = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fullFileName;
        downloadLink.style.display = 'none';
        
        // 添加到页面并触发下载
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
            console.log('Excel文件导出成功');
        }, 100);
        
    } catch (error) {
        console.error('Excel导出失败:', error);
        throw error;
    }
}

// 初始化列宽调整功能
function initResizableColumns() {
    const table = document.getElementById('modRecordTable');
    if (!table) return;
    
    let currentCol = null;
    let startX = 0;
    let startWidth = 0;
    
    // 获取所有表头
    const headers = table.querySelectorAll('th');
    
    headers.forEach((header, index) => {
        // 双击自动调整列宽
        header.addEventListener('dblclick', function() {
            autoResizeColumn(index);
        });
        
        header.addEventListener('mousedown', function(e) {
            // 只在右边缘3px内触发
            const rect = header.getBoundingClientRect();
            const distanceFromRight = rect.right - e.clientX;
            
            if (distanceFromRight < 5 && distanceFromRight >= 0) {
                currentCol = index;
                startX = e.clientX;
                startWidth = header.offsetWidth;
                
                // 添加全局事件监听
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                // 防止文本选择
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
    
    function handleMouseMove(e) {
        if (currentCol === null) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + deltaX);
        
        // 应用新宽度到该列的所有单元格
        const table = document.getElementById('modRecordTable');
        const cells = table.querySelectorAll(`th:nth-child(${currentCol + 1}), td:nth-child(${currentCol + 1})`);
        
        cells.forEach(cell => {
            cell.style.width = newWidth + 'px';
            cell.style.minWidth = Math.max(50, newWidth - 20) + 'px';
            cell.style.maxWidth = (newWidth + 100) + 'px';
        });
        
        // 添加拖拽时的视觉反馈
        const header = table.querySelector(`th:nth-child(${currentCol + 1})`);
        header.style.backgroundColor = '#e3f2fd';
    }
    
    function handleMouseUp() {
        if (currentCol !== null) {
            // 恢复表头背景色
            const table = document.getElementById('modRecordTable');
            const header = table.querySelector(`th:nth-child(${currentCol + 1})`);
            if (header) {
                header.style.backgroundColor = '';
            }
            
            // 移除事件监听
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            currentCol = null;
        }
    }
}

// 双击表头自动调整列宽
function autoResizeColumn(columnIndex) {
    const table = document.getElementById('modRecordTable');
    const cells = table.querySelectorAll(`td:nth-child(${columnIndex + 1})`);
    const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
    
    let maxWidth = 80; // 最小宽度
    const headerWidth = header ? header.scrollWidth + 20 : 80;
    maxWidth = Math.max(maxWidth, headerWidth);
    
    cells.forEach(cell => {
        const cellWidth = cell.scrollWidth + 20;
        maxWidth = Math.max(maxWidth, cellWidth);
    });
    
    // 应用自动计算的宽度
    const allCells = table.querySelectorAll(`th:nth-child(${columnIndex + 1}), td:nth-child(${columnIndex + 1})`);
    allCells.forEach(cell => {
        cell.style.width = maxWidth + 'px';
    });
}

// 重置列宽到默认值
function resetColumnWidths() {
    const table = document.getElementById('modRecordTable');
    if (!table) return;
    
    const defaultWidths = ['5%', '14%', '14%', '16%', '12%', '8%', '10%', '21%'];
    const minWidths = ['60px', '140px', '120px', '150px', '110px', '80px', '100px', '160px'];
    const maxWidths = ['80px', '200px', '180px', '250px', '160px', '100px', '120px', '300px'];
    
    defaultWidths.forEach((width, index) => {
        const cells = table.querySelectorAll(`th:nth-child(${index + 1}), td:nth-child(${index + 1})`);
        cells.forEach(cell => {
            cell.style.width = width;
            cell.style.minWidth = minWidths[index];
            cell.style.maxWidth = maxWidths[index];
        });
    });
    
    showMessage('列宽已重置为默认值', 'success');
}

// 显示编辑模态框
async function showEditModRecordModal(objectId) {
    try {
        console.log('编辑记录ID:', objectId);
        
        // 查询记录数据
        const query = new AV.Query('cus_mod');
        const record = await query.get(objectId);
        const data = record.toJSON();
        
        // 填充表单
        document.getElementById('editModRecordId').value = data.objectId;
        document.getElementById('editModApplicationNo').value = data.applicationNo || '';
        document.getElementById('editModDeclarationUnit').value = data.declarationUnit || '';
        document.getElementById('editModConsigneeName').value = data.consigneeName || '';
        document.getElementById('editModDeclarationNo').value = data.declarationNo || '';
        document.getElementById('editModContainerNo').value = data.containerNo || '';
        document.getElementById('editModOperationDate').value = data.operationDate || '';
        document.getElementById('editModReason').value = data.reason || '';
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editModRecordModal'));
        modal.show();
        
    } catch (error) {
        console.error('加载编辑数据失败:', error);
        showMessage('加载数据失败: ' + error.message, 'error');
    }
}

// 编辑修撤记录
function editModRecord(objectId) {
    if (!objectId) {
        showMessage('编辑失败：记录ID无效', 'error');
        return;
    }
    showEditModRecordModal(objectId);
}

// 保存编辑的修撤记录
async function saveEditModRecord() {
    console.log('保存编辑记录函数被调用');
    
    const form = document.getElementById('editModRecordForm');
    const objectId = document.getElementById('editModRecordId').value;
    
    console.log('表单元素检查:', form);
    console.log('记录ID:', objectId);
    
    if (!form) {
        console.error('找不到编辑表单');
        showMessage('保存失败：表单不存在', 'error');
        return;
    }
    
    if (!form.checkValidity()) {
        console.log('表单验证失败');
        form.reportValidity();
        return;
    }
    
    if (!objectId) {
        console.error('记录ID为空');
        showMessage('保存失败：记录ID无效', 'error');
        return;
    }
    
    console.log('开始保存编辑数据...');
    
    const data = {
        applicationNo: document.getElementById('editModApplicationNo').value.trim(),
        declarationUnit: document.getElementById('editModDeclarationUnit').value.trim(),
        consigneeName: document.getElementById('editModConsigneeName').value.trim(),
        declarationNo: document.getElementById('editModDeclarationNo').value.trim(),
        containerNo: document.getElementById('editModContainerNo').value.trim(),
        operationDate: document.getElementById('editModOperationDate').value,
        reason: document.getElementById('editModReason').value.trim()
    };
    
    try {
        // 获取现有记录
        const query = new AV.Query('cus_mod');
        const record = await query.get(objectId);
        
        // 如果申请单编号发生变化，检查新的申请单编号是否重复
        const checkQuery = new AV.Query('cus_mod');
        checkQuery.equalTo('applicationNo', data.applicationNo);
        checkQuery.notEqualTo('objectId', objectId); // 排除当前记录
        const existing = await checkQuery.first();
        
        if (existing) {
            showMessage('修撤申请单编号已存在', 'error');
            return;
        }
        
        // 更新记录
        Object.keys(data).forEach(key => {
            record.set(key, data[key]);
        });
        
        await record.save();
        
        showMessage('修撤记录修改成功', 'success');
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModRecordModal'));
        modal.hide();
        
        // 重新加载数据
        loadModRecordData();
        
    } catch (error) {
        console.error('保存修改失败:', error);
        showMessage('保存失败: ' + error.message, 'error');
    }
}

// 删除修撤记录
async function deleteModRecord(objectId, applicationNo) {
    if (!objectId) {
        showMessage('删除失败：记录ID无效', 'error');
        return;
    }
    
    // 确认删除
    const confirmMessage = applicationNo ? 
        `确定要删除修撤申请单"${applicationNo}"吗？` : 
        '确定要删除这条修撤记录吗？';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('删除记录:', objectId);
        
        // 创建删除查询
        const query = new AV.Query('cus_mod');
        const record = await query.get(objectId);
        
        // 删除记录
        await record.destroy();
        
        showMessage('删除成功', 'success');
        
        // 重新加载数据
        loadModRecordData();
        
    } catch (error) {
        console.error('删除记录失败:', error);
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// 导出全局函数
window.initModRecordPage = initModRecordPage;
window.deleteModRecord = deleteModRecord;
window.exportModRecordData = exportModRecordData;
window.handleExportClick = handleExportClick;
window.editModRecord = editModRecord;
window.saveEditModRecord = saveEditModRecord;
window.showEditModRecordModal = showEditModRecordModal;