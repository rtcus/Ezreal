// statistics.js - 申报货值统计功能（支持所有数据版）

let statisticsData = [];
let statisticsDetailData = [];
let currentStatType = 'month';

// 初始化统计页面
async function initStatisticsPage() {
    console.log('初始化申报货值统计页面...');

    // 绑定事件
    bindStatisticsEvents();

    // 初始加载统计数据
    await loadStatisticsData();
}

// 绑定统计相关事件
function bindStatisticsEvents() {
    // 查询统计按钮
    const queryBtn = document.getElementById('queryStatistics');
    if (queryBtn) {
        queryBtn.addEventListener('click', async function() {
            await loadStatisticsData();
        });
    }

    // 导出Excel按钮
    const exportBtn = document.getElementById('exportStatistics');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportStatisticsToExcel);
    }

    // 为统计表格添加点击排序功能
    document.addEventListener('click', function(e) {
        if (e.target.matches('.sortable-header')) {
            sortStatisticsTable(e.target);
        }
    });
}

// 清空统计结果
function clearStatisticsResults() {
    const tbody = document.getElementById('statisticsBody');
    const detailBody = document.getElementById('detailBody');
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">请查询统计数据</td></tr>';
    }
    
    if (detailBody) {
        detailBody.innerHTML = '<tr><td colspan="9" class="text-center">请查询统计数据</td></tr>';
    }
}

// 加载所有统计数据（修复版，支持大量数据）
async function loadStatisticsData() {
    try {
        console.log('开始加载统计数据...');
        
        const statType = document.getElementById('statType').value;
        let startDate, endDate, timeRangeText;
        
        if (statType === 'month') {
            const startMonth = document.getElementById('startMonth').value;
            const endMonth = document.getElementById('endMonth').value;
            
            if (!startMonth || !endMonth) {
                alert('请选择开始月份和结束月份');
                return;
            }
            
            // 验证月份范围
            if (startMonth > endMonth) {
                alert('开始月份不能晚于结束月份');
                return;
            }
            
            startDate = startMonth + '-01';
            
            // 计算结束月份的最后一天
            const endDateObj = new Date(endMonth + '-01');
            endDateObj.setMonth(endDateObj.getMonth() + 1);
            endDateObj.setDate(0);
            const lastDay = endDateObj.getDate().toString().padStart(2, '0');
            endDate = endMonth + '-' + lastDay;
            
            // 生成时间段文本
            const startYear = startMonth.substring(0, 4);
            const startMon = startMonth.substring(5, 7);
            const endYear = endMonth.substring(0, 4);
            const endMon = endMonth.substring(5, 7);
            
            if (startMonth === endMonth) {
                timeRangeText = `${startYear}年${startMon}月`;
            } else if (startYear === endYear) {
                timeRangeText = `${startYear}年${startMon}月-${endMon}月`;
            } else {
                timeRangeText = `${startYear}年${startMon}月-${endYear}年${endMon}月`;
            }
            
        } else {
            const year = document.getElementById('statYear').value;
            if (!year) {
                alert('请选择年份');
                return;
            }
            
            startDate = year + '-01-01';
            endDate = year + '-12-31';
            timeRangeText = `${year}年`;
        }
        
        console.log('统计时间段:', startDate, '至', endDate);
        
        // 显示加载状态
        showLoadingState();
        
        // 查询Tracking表中的报关数据 - 获取所有数据
        let allResults = [];
        let skip = 0;
        const limit = 1000; // 每次查询1000条
        let hasMore = true;
        
        while (hasMore) {
            const query = new AV.Query('Tracking');
            query.exists('declareDate');
            query.greaterThanOrEqualTo('declareDate', startDate);
            query.lessThanOrEqualTo('declareDate', endDate);
            query.exists('goodsValue');
            query.addAscending('declareDate');
            query.limit(limit);
            query.skip(skip);
            
            const results = await query.find();
            
            if (results.length === 0) {
                hasMore = false;
            } else {
                allResults = allResults.concat(results);
                skip += results.length;
                console.log(`已获取 ${allResults.length} 条数据...`);
                
                // 更新加载状态
                updateLoadingProgress(allResults.length);
            }
        }
        
        console.log('查询到数据条数:', allResults.length);
        
        // 处理统计数据
        processStatisticsData(allResults, timeRangeText);
        
        // 更新显示
        updateStatisticsDisplay();
        
        // 隐藏加载状态
        hideLoadingState();
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        alert('加载统计数据失败: ' + error.message);
        hideLoadingState();
    }
}

// 显示加载状态
function showLoadingState() {
    const tbody = document.getElementById('statisticsBody');
    const detailBody = document.getElementById('detailBody');
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="loading-spinner-container">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <span class="ms-2">正在加载数据...</span>
                        <div class="loading-progress mt-2" style="font-size: 0.8rem; color: #6c757d;">
                            已加载 0 条数据
                        </div>
                    </div>
                </td>
            </tr>`;
    }
    
    if (detailBody) {
        detailBody.innerHTML = '<tr><td colspan="9" class="text-center">正在加载数据...</td></tr>';
    }
    
    // 禁用查询按钮
    document.getElementById('queryStatistics').disabled = true;
}

// 更新加载进度
function updateLoadingProgress(count) {
    const progressElement = document.querySelector('.loading-progress');
    if (progressElement) {
        progressElement.textContent = `已加载 ${count.toLocaleString()} 条数据`;
    }
}

// 隐藏加载状态
function hideLoadingState() {
    // 启用查询按钮
    const queryBtn = document.getElementById('queryStatistics');
    if (queryBtn) {
        queryBtn.disabled = false;
    }
}

// 处理统计数据
function processStatisticsData(results, timeRangeText) {
    statisticsData = [];
    statisticsDetailData = [];
    
    // 按币制分组统计
    const currencyGroups = {};
    
    results.forEach((item, index) => {
        const data = item.toJSON();
        
        // 详细数据
        const detail = {
            id: index + 1,
            declareDate: data.declareDate || '',
            billNo: data.billNo || '',
            containerNo: data.containerNo || '',
            customsNo: data.customsNo || '',
            productName: data.productName || '',
            goodsValue: parseFloat(data.goodsValue) || 0,
            currency: data.currency || 'CNY',
            country: data.country || '',
            timeRange: timeRangeText
        };
        
        statisticsDetailData.push(detail);
        
        // 分组统计（按原币制）
        const currency = detail.currency || 'CNY';
        if (!currencyGroups[currency]) {
            currencyGroups[currency] = {
                currency: currency,
                count: 0,
                totalValue: 0,
                timeRange: timeRangeText
            };
        }
        
        currencyGroups[currency].count++;
        currencyGroups[currency].totalValue += detail.goodsValue;
    });
    
    // 处理统计数据
    Object.keys(currencyGroups).forEach(currency => {
        const group = currencyGroups[currency];
        
        // 格式化数字
        group.totalValueFormatted = formatNumber(group.totalValue);
        group.countFormatted = group.count.toLocaleString();
        
        statisticsData.push(group);
    });
    
    // 按总货值排序
    statisticsData.sort((a, b) => b.totalValue - a.totalValue);
}

// 格式化数字
function formatNumber(num) {
    if (num === 0 || isNaN(num)) return '0.00';
    
    // 保留两位小数，添加千分位
    return num.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 更新统计显示
function updateStatisticsDisplay() {
    // 更新统计表格
    const tbody = document.getElementById('statisticsBody');
    tbody.innerHTML = '';
    
    if (statisticsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">暂无统计数据</td></tr>';
        return;
    }
    
    statisticsData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.currency}</strong></td>
            <td>${item.countFormatted}</td>
            <td>${item.totalValueFormatted}</td>
            <td>${item.timeRange}</td>
        `;
        tbody.appendChild(row);
    });
    
    // 更新详细数据表格
    updateDetailTable();
}

// 更新详细数据表格（单独函数，便于重用）
function updateDetailTable() {
    const detailBody = document.getElementById('detailBody');
    detailBody.innerHTML = '';
    
    if (statisticsDetailData.length === 0) {
        detailBody.innerHTML = '<tr><td colspan="9" class="text-center">暂无详细数据</td></tr>';
        return;
    }
    
    // 只显示前500条详细数据，避免页面卡顿
    const displayData = statisticsDetailData.slice(0, 500);
    
    displayData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.declareDate}</td>
            <td>${item.billNo}</td>
            <td>${item.containerNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.productName}</td>
            <td>${formatNumber(item.goodsValue)}</td>
            <td>${item.currency}</td>
            <td>${item.country}</td>
        `;
        detailBody.appendChild(row);
    });
    
    // 如果数据超过500条，显示提示
    if (statisticsDetailData.length > 500) {
        const infoRow = document.createElement('tr');
        infoRow.innerHTML = `
            <td colspan="9" class="text-center text-muted small">
                共 ${statisticsDetailData.length.toLocaleString()} 条数据，仅显示前 500 条。
                如需查看完整数据，请导出Excel文件。
            </td>
        `;
        detailBody.appendChild(infoRow);
    }
    
    // 确保表头固定效果
    const detailTable = document.getElementById('detailBodyTable');
    if (detailTable) {
        detailTable.style.width = '100%';
    }
}

// 在loadStatisticsData函数最后调用updateDetailTable
// 替换原来的详细数据更新部分

// 表格排序功能
function sortStatisticsTable(header) {
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const columnIndex = Array.from(header.parentElement.children).indexOf(header);
    
    // 获取所有行
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 判断当前排序方向
    const isAscending = header.classList.contains('sort-asc');
    
    // 清除其他列的排序状态
    table.querySelectorAll('.sortable-header').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 切换排序方向
    header.classList.toggle('sort-asc', !isAscending);
    header.classList.toggle('sort-desc', isAscending);
    
    // 对行进行排序
    rows.sort((a, b) => {
        const aCell = a.children[columnIndex];
        const bCell = b.children[columnIndex];
        
        let aValue = aCell.textContent.trim();
        let bValue = bCell.textContent.trim();
        
        // 尝试转换为数字
        const aNum = parseFloat(aValue.replace(/,/g, ''));
        const bNum = parseFloat(bValue.replace(/,/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            aValue = aNum;
            bValue = bNum;
        }
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return isAscending ? -comparison : comparison;
    });
    
    // 重新插入行
    rows.forEach(row => tbody.appendChild(row));
}

// 导出统计报表到Excel
async function exportStatisticsToExcel() {
    try {
        if (statisticsData.length === 0) {
            alert('没有可导出的数据');
            return;
        }
        
        // 显示导出提示
        alert('开始导出Excel文件，数据量较大时可能需要一些时间...');
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建汇总表
        const summaryData = [
            ['申报货值统计报表'],
            [`统计时间: ${new Date().toLocaleString('zh-CN')}`],
            [`数据总数: ${statisticsDetailData.length} 条`],
            [],
            ['币制', '申报数量', '总货值(原币)', '统计时间段']
        ];
        
        statisticsData.forEach(item => {
            summaryData.push([
                item.currency,
                item.count,
                item.totalValue,
                item.timeRange
            ]);
        });
        
        // 添加总计行
        const totalCount = statisticsData.reduce((sum, item) => sum + item.count, 0);
        const totalValue = statisticsData.reduce((sum, item) => sum + item.totalValue, 0);
        summaryData.push([
            '总计',
            totalCount,
            totalValue,
            ''
        ]);
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        
        // 创建详细数据表（导出所有数据）
        const detailData = [
            ['详细数据'],
            [`共 ${statisticsDetailData.length} 条记录`],
            [],
            ['序号', '申报日期', '提单号', '柜号', '报关单号', '品名', '货值', '币制', '国家']
        ];
        
        // 分批添加数据，避免内存溢出
        const batchSize = 50000; // 每批5万条
        for (let i = 0; i < statisticsDetailData.length; i += batchSize) {
            const batch = statisticsDetailData.slice(i, i + batchSize);
            batch.forEach(item => {
                detailData.push([
                    item.id,
                    item.declareDate,
                    item.billNo,
                    item.containerNo,
                    item.customsNo,
                    item.productName,
                    item.goodsValue,
                    item.currency,
                    item.country
                ]);
            });
        }
        
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        
        // 设置列宽
        const summaryCols = [
            {wch: 15}, // 币制
            {wch: 12}, // 数量
            {wch: 20}, // 总货值
            {wch: 20}  // 时间段
        ];
        
        const detailCols = [
            {wch: 8},  // 序号
            {wch: 12}, // 申报日期
            {wch: 15}, // 提单号
            {wch: 12}, // 柜号
            {wch: 18}, // 报关单号
            {wch: 25}, // 品名
            {wch: 15}, // 货值
            {wch: 10}, // 币制
            {wch: 15}  // 国家
        ];
        
        summarySheet['!cols'] = summaryCols;
        detailSheet['!cols'] = detailCols;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, summarySheet, '汇总统计');
        XLSX.utils.book_append_sheet(wb, detailSheet, '详细数据');
        
        // 生成文件名
        const statType = document.getElementById('statType').value;
        let fileName = '';
        
        if (statType === 'month') {
            const startMonth = document.getElementById('startMonth').value;
            const endMonth = document.getElementById('endMonth').value;
            
            if (startMonth === endMonth) {
                fileName = `申报货值统计_${startMonth}.xlsx`;
            } else {
                fileName = `申报货值统计_${startMonth}_至_${endMonth}.xlsx`;
            }
        } else {
            const year = document.getElementById('statYear').value;
            fileName = `申报货值统计_${year}年.xlsx`;
        }
        
        // 导出文件
        XLSX.writeFile(wb, fileName);
        
        console.log('统计报表导出成功:', fileName);
        alert(`导出成功！文件已保存为：${fileName}`);
        
    } catch (error) {
        console.error('导出统计报表失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 导出函数
window.initStatisticsPage = initStatisticsPage;
window.loadStatisticsData = loadStatisticsData;
window.exportStatisticsToExcel = exportStatisticsToExcel;