// 出口商管理功能模块
let exporterData = [];
let filteredExporterData = [];
let exporterItemsPerPage = 20;
let exporterCurrentPageIndex = 1;
let exporterTotalPages = 1;

// 加载出口商数据
async function loadExporterData() {
    try {
        const tbody = document.querySelector('#exporterTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" class="loading">正在加载数据...</td></tr>';
        
        // 检查表是否存在
        const tableExists = await checkTableExists('Exporter_Base');
        if (!tableExists) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">出口商表不存在，请先在LeanCloud后台创建Exporter_Base表</td></tr>';
            return;
        }

        const query = new AV.Query('Exporter_Base');
        query.descending('createdAt');
        
        // 移除限制，获取所有数据
        const results = await query.find();
        
        exporterData = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                foreignConsignee: data.foreignConsignee || '',
                shipperRecordNo: data.shipperRecordNo || '',
                customsNo: data.customsNo || '',
                arrivalDate: data.arrivalDate || '',
                syncTime: data.updatedAt || data.createdAt,
                leanCloudObject: item
            };
        });
        
        filteredExporterData = [...exporterData];
        exporterCurrentPageIndex = 1;
        updateExporterPagination();
        renderExporterTable();
        
    } catch (error) {
        console.error('加载出口商数据失败:', error);
        const tbody = document.querySelector('#exporterTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">数据加载失败: ' + error.message + '</td></tr>';
        }
    }
}

// 渲染出口商表格
function renderExporterTable() {
    const tbody = document.querySelector('#exporterTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredExporterData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">没有找到匹配的数据</td></tr>';
        return;
    }
    
    const startIndex = (exporterCurrentPageIndex - 1) * exporterItemsPerPage;
    const endIndex = Math.min(startIndex + exporterItemsPerPage, filteredExporterData.length);
    const currentPageData = filteredExporterData.slice(startIndex, endIndex);
    
    currentPageData.forEach((item, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index;
        
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>${item.foreignConsignee}</td>
            <td>${item.shipperRecordNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.arrivalDate || ''}</td>
            <td>${item.syncTime ? new Date(item.syncTime).toLocaleString('zh-CN') : ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateExporterPaginationInfo();
}

// 更新出口商分页
function updateExporterPagination() {
    exporterTotalPages = Math.ceil(filteredExporterData.length / exporterItemsPerPage);
    const paginationElement = document.getElementById('exporterPagination');
    
    if (exporterTotalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    if (exporterCurrentPageIndex > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-exporter-page="${exporterCurrentPageIndex - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">上一页</a></li>`;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, exporterCurrentPageIndex - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(exporterTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === exporterCurrentPageIndex) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#" data-exporter-page="${i}">${i}</a></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-exporter-page="${i}">${i}</a></li>`;
        }
    }
    
    if (exporterCurrentPageIndex < exporterTotalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-exporter-page="${exporterCurrentPageIndex + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">下一页</a></li>`;
    }
    
    paginationElement.innerHTML = paginationHTML;
    
    document.querySelectorAll('#exporterPagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-exporter-page'));
            if (page && page !== exporterCurrentPageIndex) {
                exporterCurrentPageIndex = page;
                renderExporterTable();
                updateExporterPagination();
            }
        });
    });
}

// 更新出口商分页信息
function updateExporterPaginationInfo() {
    const totalItems = filteredExporterData.length;
    document.getElementById('exporterPaginationInfo').innerHTML = `共 ${totalItems} 条记录`;
}

// 搜索出口商
function searchExporter() {
    const foreignConsignee = document.getElementById('foreignConsigneeSearch').value.trim();
    const shipperRecordNo = document.getElementById('shipperRecordNoSearch').value.trim();

    filteredExporterData = exporterData.filter(item => {
        let match = true;

        // 境外收发货人：不区分大小写的模糊查询
        if (foreignConsignee && !item.foreignConsignee.toLowerCase().includes(foreignConsignee.toLowerCase())) {
            match = false;
        }

        // 发货人备案号：不区分大小写的模糊查询
        if (shipperRecordNo && !item.shipperRecordNo.toLowerCase().includes(shipperRecordNo.toLowerCase())) {
            match = false;
        }

        return match;
    });

    exporterCurrentPageIndex = 1;
    updateExporterPagination();
    renderExporterTable();
}

// 清空出口商搜索条件
function clearExporterSearch() {
    document.getElementById('foreignConsigneeSearch').value = '';
    document.getElementById('shipperRecordNoSearch').value = '';
    filteredExporterData = [...exporterData];
    exporterCurrentPageIndex = 1;
    updateExporterPagination();
    renderExporterTable();
}

// 导出出口商数据
function exportExporter() {
    if (filteredExporterData.length === 0) {
        alert('没有可导出的数据');
        return;
    }

    // 准备导出数据
    const exportData = filteredExporterData.map((item, index) => ({
        '序号': index + 1,
        '境外收发货人': item.foreignConsignee,
        '发货人备案号': item.shipperRecordNo,
        '报关单号': item.customsNo,
        '到港日期': item.arrivalDate || '',
        '同步时间': item.syncTime ? new Date(item.syncTime).toLocaleString('zh-CN') : ''
    }));

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '出口商');

    // 生成文件名
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const fileName = `出口商_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`;

    // 导出文件
    XLSX.writeFile(wb, fileName);
}

// 从报关数据同步出口商 - 修复版（实时同步所有数据）
async function syncExporterFromCustoms() {
    try {
        // 检查表是否存在
        const tableExists = await checkTableExists('Exporter_Base');
        if (!tableExists) {
            alert('出口商表不存在，请先在LeanCloud后台创建Exporter_Base表');
            return;
        }

        // 显示同步中提示
        const syncBtn = document.getElementById('syncExporter');
        const originalText = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中...';
        syncBtn.disabled = true;
        
        console.log('开始同步出口商数据...');
        
        // 从报关数据中查询所有有出口商信息的记录（不限制）
        const query = new AV.Query('Tracking');
        query.exists('foreignConsignee');
        query.exists('shipperRecordNo');
        query.ascending('arrivalDate');
        query.limit(1000); // 增加查询限制
        
        let allResults = [];
        let queryCount = 0;
        let hasMore = true;
        
        // 分批次获取所有数据
        while (hasMore) {
            try {
                query.skip(queryCount);
                const results = await query.find();
                
                if (results.length === 0) {
                    hasMore = false;
                    break;
                }
                
                allResults = allResults.concat(results);
                queryCount += results.length;
                console.log(`已获取 ${queryCount} 条记录...`);
                
                // 如果获取到的数据少于限制数，说明没有更多数据了
                if (results.length < 1000) {
                    hasMore = false;
                }
            } catch (error) {
                console.error('获取数据失败:', error);
                hasMore = false;
            }
        }
        
        console.log(`总共获取到 ${allResults.length} 条报关数据记录`);
        
        let syncCount = 0;
        let skipCount = 0;
        let updateCount = 0;
        let errorCount = 0;
        
        // 批量处理数据
        const batchSize = 50;
        const totalBatches = Math.ceil(allResults.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, allResults.length);
            const batchItems = allResults.slice(start, end);
            
            for (const item of batchItems) {
                try {
                    const data = item.toJSON();
                    
                    if (!data.foreignConsignee || !data.shipperRecordNo) {
                        continue;
                    }
                    
                    // 检查是否已存在
                    const existingQuery = new AV.Query('Exporter_Base');
                    existingQuery.equalTo('foreignConsignee', data.foreignConsignee);
                    existingQuery.equalTo('shipperRecordNo', data.shipperRecordNo);
                    const existing = await existingQuery.first();
                    
                    if (!existing) {
                        // 创建新的出口商记录
                        const exporterObj = new AV.Object('Exporter_Base');
                        exporterObj.set('foreignConsignee', data.foreignConsignee || '');
                        exporterObj.set('shipperRecordNo', data.shipperRecordNo || '');
                        exporterObj.set('customsNo', data.customsNo || '');
                        exporterObj.set('arrivalDate', data.arrivalDate || '');
                        await exporterObj.save();
                        syncCount++;
                    } else {
                        // 按最近日期更新：如果当前记录的日期比已有记录的日期更晚，则更新
                        const existingDate = existing.get('arrivalDate');
                        const currentDate = data.arrivalDate;

                        const needsUpdate = 
                            (currentDate && (!existingDate || currentDate > existingDate)) ||
                            existing.get('customsNo') !== data.customsNo;

                        if (needsUpdate) {
                            existing.set('customsNo', data.customsNo || '');
                            if (currentDate && (!existingDate || currentDate > existingDate)) {
                                existing.set('arrivalDate', currentDate);
                            }
                            await existing.save();
                            updateCount++;
                        } else {
                            skipCount++;
                        }
                    }
                } catch (error) {
                    console.error('处理记录失败:', error);
                    errorCount++;
                }
            }
            
            console.log(`批次 ${batchIndex + 1}/${totalBatches} 完成`);
        }
        
        await loadExporterData();
        
        // 恢复按钮状态
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
        
        // 显示同步结果
        let message = `同步完成！\n`;
        if (syncCount > 0) message += `新增: ${syncCount} 条\n`;
        if (updateCount > 0) message += `更新: ${updateCount} 条\n`;
        if (skipCount > 0) message += `跳过: ${skipCount} 条\n`;
        if (errorCount > 0) message += `错误: ${errorCount} 条`;
        
        alert(message);
        
    } catch (error) {
        console.error('同步出口商数据失败:', error);
        alert('同步失败: ' + error.message);
        
        // 恢复按钮状态
        const syncBtn = document.getElementById('syncExporter');
        syncBtn.innerHTML = '<i class="fas fa-sync"></i> 同步报关数据';
        syncBtn.disabled = false;
    }
}

// 绑定出口商管理事件
document.addEventListener('DOMContentLoaded', function() {
    // 查询按钮
    const searchExporterBtn = document.getElementById('searchExporter');
    if (searchExporterBtn) {
        searchExporterBtn.addEventListener('click', searchExporter);
    }
    
    // 清空按钮
    const clearExporterBtn = document.getElementById('clearExporter');
    if (clearExporterBtn) {
        clearExporterBtn.addEventListener('click', clearExporterSearch);
    }
    
    // 同步按钮
    const syncExporterBtn = document.getElementById('syncExporter');
    if (syncExporterBtn) {
        syncExporterBtn.addEventListener('click', syncExporterFromCustoms);
    }

    // 导出按钮
    const exportExporterBtn = document.getElementById('exportExporter');
    if (exportExporterBtn) {
        exportExporterBtn.addEventListener('click', exportExporter);
    }
    
    // 每页显示条数变化
    const exporterPageSizeSelect = document.getElementById('exporterPageSizeSelect');
    if (exporterPageSizeSelect) {
        exporterPageSizeSelect.addEventListener('change', function() {
            exporterItemsPerPage = parseInt(this.value);
            exporterCurrentPageIndex = 1;
            updateExporterPagination();
            renderExporterTable();
        });
    }
});