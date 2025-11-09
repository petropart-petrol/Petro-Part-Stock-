// -----------------------------------------------------------------
// ⚠️ !! هام جداً: غيّر هذا الرابط بالرابط الخاص بك من SheetDB !! ⚠️
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/toxu6mq5ih3gc';
// -----------------------------------------------------------------

// --- 1. تعريف المتغيرات وعناصر الصفحة ---

// المخازن المتاحة
const WAREHOUSES = {
    Inventory_Halfa: "مخزن حلفا الجديدة",
    Inventory_Portsudan: "مخزن بورتسودان"
};
// المخزن المعروض حالياً
let currentWarehouseKey = 'Inventory_Halfa';

// عناصر الصفحة
const tableBody = document.getElementById('tableBody');
const loadingDiv = document.getElementById('loading');
const dollarRateInput = document.getElementById('dollarRate');
const searchInput = document.getElementById('searchInput');
const warehouseSelector = document.getElementById('warehouseSelector');
const mainTableTitle = document.getElementById('mainTableTitle');

// أزرار التحكم الرئيسية
const showAddBtn = document.getElementById('showAddForm');
const showWithdrawBtn = document.getElementById('showWithdrawForm');
const showReportBtn = document.getElementById('showReport');

// النوافذ
const addModal = document.getElementById('addModal');
const withdrawModal = document.getElementById('withdrawModal');
const reportModal = document.getElementById('reportModal');
const editModal = document.getElementById('editModal');
const editTransactionModal = document.getElementById('editTransactionModal'); // جديد

// أزرار إغلاق النوافذ (معرفة هنا للاستخدام في دوال الإغلاق)
const closeAddBtn = document.getElementById('closeAddModal');
const closeWithdrawBtn = document.getElementById('closeWithdrawModal');
const closeReportBtn = document.getElementById('closeReportModal');
const closeEditModalBtn = document.getElementById('closeEditModal');
const closeEditTransactionModal = document.getElementById('closeEditTransactionModal'); // جديد

// استمارات
const addForm = document.getElementById('addForm');
const withdrawForm = document.getElementById('withdrawForm');
const editForm = document.getElementById('editForm');
const editTransactionForm = document.getElementById('editTransactionForm'); // جديد

// عناصر أخرى
const withdrawPartNameInput = document.getElementById('withdrawPartName');
const withdrawItemDetails = document.getElementById('withdrawItemDetails');
const withdrawWarehouseSelect = document.getElementById('withdrawWarehouse'); // جديد
const addWarehouseSelect = document.getElementById('addWarehouse'); // جديد
const datalist = document.getElementById('partNamesList');

// مخازن البيانات (Cache)
let allInventoryData = {
    Inventory_Halfa: [],
    Inventory_Portsudan: []
};
let currentReportData = [];

// --- 2. دوال جلب وعرض بيانات المخزون (متعدد المخازن) ---

// دالة لجلب بيانات *جميع* المخازن عند بدء التشغيل
async function fetchAllInventories() {
    showLoading(true);
    try {
        const fetchHalfa = fetch(`${SHEETDB_API_URL}?sheet=Inventory_Halfa`).then(res => res.json());
        const fetchPortsudan = fetch(`${SHEETDB_API_URL}?sheet=Inventory_Portsudan`).then(res => res.json());

        const [halfaData, portsudanData] = await Promise.all([fetchHalfa, fetchPortsudan]);

        allInventoryData.Inventory_Halfa = halfaData.sort((a, b) => (parseInt(a.PartNumber) || 0) - (parseInt(b.PartNumber) || 0));
        allInventoryData.Inventory_Portsudan = portsudanData.sort((a, b) => (parseInt(a.PartNumber) || 0) - (parseInt(b.PartNumber) || 0));

        console.log("تم تحميل جميع المخازن:", allInventoryData);
        // عرض المخزن الافتراضي
        renderTable(); 
        showLoading(false);
    } catch (error) {
        console.error('Error fetching all inventories:', error);
        loadingDiv.innerText = 'حدث خطأ كبير أثناء تحميل بيانات المخازن. تأكد من صحة أسماء الصفحات (Tabs) في Google Sheet.';
    }
}

// دالة لعرض الجدول بناءً على المخزن المحدد (currentWarehouseKey)
function renderTable() {
    const data = allInventoryData[currentWarehouseKey] || [];
    // تحديث عنوان الجدول
    mainTableTitle.innerText = `مخزون: ${WAREHOUSES[currentWarehouseKey]}`;
    
    tableBody.innerHTML = ''; 
    const currentDollarRate = parseFloat(dollarRateInput.value) || 0;
    const filter = searchInput.value.toLowerCase(); // تطبيق البحث

    const filteredData = data.filter(item => {
        const partName = (item.PartName || "").toLowerCase();
        return partName.includes(filter);
    });

    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">لا توجد بيانات لعرضها (أو مطابقة للبحث)</td></tr>';
        return;
    }

    filteredData.forEach((item) => {
        const priceUSD = parseFloat(item.PriceUSD) || 0;
        const priceSDG = (priceUSD * currentDollarRate).toFixed(2); 

        const row = `
            <tr>
                <td>${item.PartNumber || ''}</td>
                <td>${item.PartName || ''}</td>
                <td>${item.Quantity || 0}</td>
                <td>$${priceUSD.toFixed(2)}</td>
                <td>${priceSDG} ج.س</td>
                <td>
                    <button class="btn btn-edit" 
                        data-partnumber="${item.PartNumber}" 
                        data-name="${item.PartName}" 
                        data-quantity="${item.Quantity}" 
                        data-price="${item.PriceUSD}">
                        تعديل
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// تحديث الأسعار أو البحث
function updateSDGPrices() { renderTable(); }
function searchTable() { renderTable(); }

function showLoading(isLoading) {
    loadingDiv.style.display = isLoading ? 'block' : 'none';
    document.getElementById('inventoryTable').style.display = isLoading ? 'none' : 'table';
}

// دالة لملء قائمة الاقتراحات (تعتمد الآن على المخزن المحدد في نافذة السحب)
function populatePartNamesDatalist(warehouseKey) {
    datalist.innerHTML = ''; 
    if (!warehouseKey || !allInventoryData[warehouseKey]) {
        return; // لا تملأ القائمة إذا لم يتم اختيار مخزن
    }
    const data = allInventoryData[warehouseKey];
    const partNames = new Set(data.map(item => item.PartName.trim()));
    partNames.forEach(name => {
        if (name) {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        }
    });
}

// --- 3. منطق الإضافة والسحب والتعديل (متعدد المخازن) ---

// إضافة قطعة (معدل)
async function handleAddItem(e) {
    e.preventDefault(); 
    const selectedWarehouse = addWarehouseSelect.value; // المخزن المحدد للإضافة
    const itemData = {
        PartName: document.getElementById('addPartName').value.trim(),
        Quantity: parseInt(document.getElementById('addQuantity').value),
        PriceUSD: parseFloat(document.getElementById('addPriceUSD').value),
    };
    
    if (!itemData.PartName || itemData.Quantity <= 0 || itemData.PriceUSD <= 0) { alert("بيانات غير صحيحة."); return; }

    const warehouseInventory = allInventoryData[selectedWarehouse];
    const existingItem = warehouseInventory.find(item => item.PartName.toLowerCase() === itemData.PartName.toLowerCase());
    let partNumberToLog;

    if (existingItem) {
        // تحديث الكمية
        const newQuantity = parseInt(existingItem.Quantity) + itemData.Quantity;
        partNumberToLog = existingItem.PartNumber; 
        try { await updateSheetDB(`PartNumber/${existingItem.PartNumber}`, { Quantity: newQuantity }, selectedWarehouse); } 
        catch (error) { alert('فشل تحديث الكمية.'); return; }
    } else {
        // إضافة قطعة جديدة (نحتاج لإيجاد أعلى ID في *كلا* المخزنين لضمان عدم التضارب)
        const allPartNumbers = [
            ...allInventoryData.Inventory_Halfa.map(i => parseInt(i.PartNumber) || 0),
            ...allInventoryData.Inventory_Portsudan.map(i => parseInt(i.PartNumber) || 0)
        ];
        const maxId = Math.max(0, ...allPartNumbers);
        const newPartNumber = maxId + 1;
        partNumberToLog = newPartNumber; 
        const newItem = { ...itemData, PartNumber: newPartNumber };
        try { await postToSheetDB([newItem], selectedWarehouse); } 
        catch (error) { alert('فشل إضافة القطعة.'); return; }
    }

    // تسجيل الحركة
    const transactionData = {
        Timestamp: new Date().toISOString(), Type: 'إضافة', 
        PartNumber: partNumberToLog, PartName: itemData.PartName, 
        Quantity: itemData.Quantity, PriceUSD: itemData.PriceUSD,
        Warehouse: WAREHOUSES[selectedWarehouse] // إضافة اسم المخزن
    };
    try {
        await postToSheetDB([transactionData], 'Transactions');
        alert('تمت الإضافة بنجاح!');
        addForm.reset(); closeModal(addModal); 
        await fetchAllInventories(); // إعادة تحميل *كل* البيانات
    } catch (error) { alert('فشل تسجيل الحركة.'); }
}

// عرض التفاصيل في نافذة السحب (معدل)
function showWithdrawItemDetails() {
    const selectedWarehouse = withdrawWarehouseSelect.value;
    const partName = withdrawPartNameInput.value.toLowerCase().trim();
    if (!selectedWarehouse || !partName) { withdrawItemDetails.innerHTML = ''; return; }
    
    const item = allInventoryData[selectedWarehouse].find(i => i.PartName.toLowerCase().trim() === partName);
    if (item) { withdrawItemDetails.innerHTML = `الكمية المتاحة: <span class="text-success">${item.Quantity}</span>`; } 
    else { withdrawItemDetails.innerHTML = `<span class="text-danger">القطعة غير موجودة</span>`; }
}

// سحب قطعة (معدل)
async function handleWithdrawItem(e) {
    e.preventDefault();
    const selectedWarehouse = withdrawWarehouseSelect.value; // المخزن المحدد للسحب
    const partName = withdrawPartNameInput.value.trim();
    const quantityToWithdraw = parseInt(document.getElementById('withdrawQuantity').value);
    const buyer = document.getElementById('withdrawBuyer').value.trim();
    const location = document.getElementById('withdrawLocation').value.trim(); 
    const actualSDG = parseFloat(document.getElementById('withdrawActualSDG').value) || 0;

    if (!selectedWarehouse || !partName || quantityToWithdraw <= 0 || !buyer) { alert('الرجاء ملء جميع الحقول المطلوبة.'); return; }
    
    const item = allInventoryData[selectedWarehouse].find(i => i.PartName.toLowerCase().trim() === partName.toLowerCase());
    if (!item) { alert('خطأ: اسم القطعة غير موجود في هذا المخزن.'); return; }
    const currentQuantity = parseInt(item.Quantity);
    if (currentQuantity < quantityToWithdraw) { alert(`خطأ: الكمية المطلوبة (${quantityToWithdraw}) أكبر من المتاحة (${currentQuantity}).`); return; }

    const newQuantity = currentQuantity - quantityToWithdraw;
    try { await updateSheetDB(`PartNumber/${item.PartNumber}`, { Quantity: newQuantity }, selectedWarehouse); } 
    catch (error) { alert('فشل تحديث المخزون.'); return; }

    const currentDollarRate = parseFloat(dollarRateInput.value);
    const priceUSD = parseFloat(item.PriceUSD);
    const totalUSD = priceUSD * quantityToWithdraw;
    const priceSDG = actualSDG > 0 ? actualSDG : (totalUSD * currentDollarRate);

    const transactionData = {
        Timestamp: new Date().toISOString(),
        Type: 'سحب',
        PartNumber: item.PartNumber,
        PartName: item.PartName,
        Quantity: quantityToWithdraw,
        Buyer: buyer,
        BuyerLocation: location,
        PriceUSD: totalUSD,
        PriceSDG: priceSDG,
        DollarRate: currentDollarRate,
        Warehouse: WAREHOUSES[selectedWarehouse] // إضافة اسم المخزن
    };

    try {
        await postToSheetDB([transactionData], 'Transactions');
        alert('تم السحب بنجاح!');
        withdrawForm.reset(); withdrawItemDetails.innerHTML = ''; 
        closeModal(withdrawModal);
        await fetchAllInventories(); // إعادة تحميل *كل* البيانات
    } catch (error) {
        alert('فشل تسجيل عملية السحب.');
    }
}

// تعديل قطعة (مخزون)
async function handleEditItem(e) {
    e.preventDefault();
    const partNumber = document.getElementById('editPartNumber').value;
    const updatedData = {
        PartName: document.getElementById('editPartName').value,
        Quantity: document.getElementById('editQuantity').value,
        PriceUSD: document.getElementById('editPriceUSD').value
    };
    if (!updatedData.PartName || updatedData.Quantity < 0 || updatedData.PriceUSD < 0) { alert('بيانات غير صحيحة.'); return; }
    
    // التعديل يجب أن يحدث في المخزن المعروض حالياً
    try {
        await updateSheetDB(`PartNumber/${partNumber}`, updatedData, currentWarehouseKey);
        alert('تم تعديل القطعة بنجاح!');
        closeModal(editModal);
        await fetchAllInventories(); // إعادة تحميل *كل* البيانات
    } catch (error) { console.error('Error updating item:', error); alert('فشل في تعديل القطعة.'); }
}

// --- 4. منطق التقرير والتصدير (معدل) ---

async function handleShowReport() {
    openModal(reportModal);
    const reportBody = document.getElementById('reportTableBody');
    const summaryDiv = document.getElementById('summaryContent');
    
    reportBody.innerHTML = `<tr><td colspan="9">جاري تحميل التقرير...</td></tr>`;
    summaryDiv.innerHTML = '<p>جاري حساب الإحصائيات...</p>';
    currentReportData = [];

    try {
        const response = await fetch(`${SHEETDB_API_URL}?sheet=Transactions`);
        if (!response.ok) throw new Error('فشل جلب بيانات التقرير');
        
        const transactions = await response.json();
        currentReportData = transactions; // تخزين البيانات للتصدير
        const withdrawals = transactions.filter(t => t.Type === 'سحب');

        // (منطق الإحصائيات - لم يتغير)
        let totalUSD = 0; let totalSDG = 0; const buyerSales = {}; const partSales = {};
        withdrawals.forEach(t => {
            const saleUSD = parseFloat(t.PriceUSD) || 0; const saleSDG = parseFloat(t.PriceSDG) || 0;
            const quantity = parseInt(t.Quantity) || 0;
            totalUSD += saleUSD; totalSDG += saleSDG;
            if (t.Buyer) { buyerSales[t.Buyer] = (buyerSales[t.Buyer] || 0) + saleUSD; }
            if (t.PartName) { partSales[t.PartName] = (partSales[t.PartName] || 0) + quantity; }
        });
        const sortedBuyers = Object.entries(buyerSales).sort((a, b) => b[1] - a[1]);
        const sortedParts = Object.entries(partSales).sort((a, b) => b[1] - a[1]);
        const topBuyer = sortedBuyers.length > 0 ? `${sortedBuyers[0][0]} (بقيمة $${sortedBuyers[0][1].toFixed(2)})` : 'لا يوجد';
        const topPart = sortedParts.length > 0 ? `${sortedParts[0][0]} (بكمية ${sortedParts[0][1]})` : 'لا يوجد';
        summaryDiv.innerHTML = `
            <p><strong>إجمالي المبيعات (دولار):</strong> <span class="text-success">$${totalUSD.toFixed(2)}</span></p>
            <p><strong>إجمالي المبيعات (جنيه):</strong> <span class="text-success">${totalSDG.toFixed(2)} ج.س</span></p>
            <p><strong>المشتري الأكثر مبيعاً:</strong> ${topBuyer}</p>
            <p><strong>القطعة الأكثر مبيعاً:</strong> ${topPart}</p>
        `;

        transactions.reverse(); 
        reportBody.innerHTML = '';
        if (transactions.length === 0) { reportBody.innerHTML = '<tr><td colspan="9">لا توجد حركات مسجلة.</td></tr>'; return; }

        transactions.forEach(t => {
            const timestamp = new Date(t.Timestamp).toLocaleString('ar-EG');
            const row = `
                <tr>
                    <td>${timestamp}</td>
                    <td class="${t.Type === 'سحب' ? 'text-danger' : 'text-success'}">${t.Type}</td>
                    <td>${t.Warehouse || '---'}</td> <td>${t.PartName || '---'}</td>
                    <td>${t.Quantity || 0}</td>
                    <td>${t.Buyer || '---'}</td>
                    <td>${t.BuyerLocation || '---'}</td>
                    <td>${parseFloat(t.PriceSDG || 0).toFixed(2)} ج.س</td>
                    <td>
                        <button class="btn btn-edit-tx" data-timestamp="${t.Timestamp}">
                            تعديل
                        </button>
                    </td>
                </tr>
            `;
            reportBody.innerHTML += row;
        });

    } catch (error) {
        console.error('Error fetching report:', error);
        reportBody.innerHTML = '<tr><td colspan="9">حدث خطأ أثناء تحميل التقرير.</td></tr>';
        summaryDiv.innerHTML = '<p class="text-danger">فشل تحميل الإحصائيات.</p>';
    }
}

// دالة تصدير التقرير (تعديل الأعمدة)
function exportDataToCSV(data, filename) {
    if (data.length === 0) { alert('لا توجد بيانات لتصديرها.'); return; }
    // تعديل الأعمدة لتشمل "المخزن"
    const headers = [
        "Timestamp", "Type", "Warehouse", "PartNumber", "PartName", 
        "Quantity", "Buyer", "BuyerLocation", 
        "PriceUSD", "PriceSDG", "DollarRate"
    ];
    const escapeCSV = (str) => {
        if (str === null || str === undefined) str = "";
        str = String(str);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; 
    csvContent += headers.join(",") + "\n"; 
    data.forEach(row => {
        const rowData = headers.map(header => escapeCSV(row[header]));
        csvContent += rowData.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 5. منطق تعديل الحركات (جديد) ---

// فتح نافذة تعديل الحركة
function openEditTransactionModal(event) {
    const timestamp = event.target.dataset.timestamp;
    const transaction = currentReportData.find(t => t.Timestamp === timestamp);
    
    if (!transaction) {
        alert('لم يتم العثور على الحركة!');
        return;
    }

    // ملء الفورم
    document.getElementById('txTimestamp').value = transaction.Timestamp;
    document.getElementById('txPartName').value = transaction.PartName || '';
    document.getElementById('txQuantity').value = transaction.Quantity || 0;
    document.getElementById('txBuyer').value = transaction.Buyer || '';
    document.getElementById('txBuyerLocation').value = transaction.BuyerLocation || '';
    document.getElementById('txPriceSDG').value = transaction.PriceSDG || 0;
    document.getElementById('txWarehouse').value = transaction.Warehouse || '';

    openModal(editTransactionModal);
}

// حفظ تعديل الحركة
async function handleEditTransaction(e) {
    e.preventDefault();
    
    const timestamp = document.getElementById('txTimestamp').value;
    const updatedData = {
        PartName: document.getElementById('txPartName').value,
        Quantity: document.getElementById('txQuantity').value,
        Buyer: document.getElementById('txBuyer').value,
        BuyerLocation: document.getElementById('txBuyerLocation').value,
        PriceSDG: document.getElementById('txPriceSDG').value,
        Warehouse: document.getElementById('txWarehouse').value
    };

    try {
        // نستخدم "Timestamp" كـ "مفتاح" للبحث والتحديث في صفحة "Transactions"
        await updateSheetDB(`Timestamp/${timestamp}`, updatedData, 'Transactions');
        alert('تم تعديل الحركة بنجاح!');
        closeModal(editTransactionModal);
        handleShowReport(); // إعادة تحميل التقرير لعرض التغييرات
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('فشل في تعديل الحركة. تأكد أن عمود Timestamp موجود وصحيح.');
    }
}


// --- 6. دوال مساعدة (للاتصال بـ SheetDB) ---
// (ملاحظة: "sheetName" أصبح مهماً جداً الآن)
async function postToSheetDB(data, sheetName) {
    const url = `${SHEETDB_API_URL}?sheet=${sheetName}`;
    const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data }),
    });
    if (!response.ok) throw new Error('فشل في إرسال البيانات (POST)');
    return response.json();
}
async function updateSheetDB(searchKey, data, sheetName) {
    const url = `${SHEETDB_API_URL}/${searchKey}?sheet=${sheetName}`;
    const response = await fetch(url, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data }), 
    });
    if (!response.ok) throw new Error('فشل في تحديث البيانات (PATCH)');
    return response.json();
}

// --- 7. إدارة النوافذ وربط الأحداث ---

// فتح نافذة تعديل قطعة (مخزون)
function openEditModal(event) {
    const button = event.target;
    document.getElementById('editPartNumber').value = button.dataset.partnumber;
    document.getElementById('editPartName').value = button.dataset.name;
    document.getElementById('editQuantity').value = button.dataset.quantity;
    document.getElementById('editPriceUSD').value = button.dataset.price;
    openModal(editModal);
}

function openModal(modal) { modal.style.display = 'block'; }
function closeModal(modal) { modal.style.display = 'none'; }

// ربط أزرار الفتح والإغلاق
showAddBtn.onclick = () => openModal(addModal);
showWithdrawBtn.onclick = () => openModal(withdrawModal);
showReportBtn.onclick = () => handleShowReport(); 
closeAddBtn.onclick = () => closeModal(addModal);
closeEditModalBtn.onclick = () => closeModal(editModal); 
closeReportBtn.onclick = () => closeModal(reportModal);
closeEditTransactionModal.onclick = () => closeModal(editTransactionModal); // جديد
closeWithdrawBtn.onclick = () => { closeModal(withdrawModal); withdrawItemDetails.innerHTML = ''; withdrawForm.reset(); };

window.onclick = function(event) {
    if (event.target == addModal) closeModal(addModal);
    if (event.target == reportModal) closeModal(reportModal);
    if (event.target == editModal) closeModal(editModal); 
    if (event.target == editTransactionModal) closeModal(editTransactionModal); // جديد
    if (event.target == withdrawModal) { closeModal(withdrawModal); withdrawItemDetails.innerHTML = ''; withdrawForm.reset(); }
}

// --- 8. ربط الأحداث الرئيسية ---

// عند تحميل الصفحة، ابدأ بجلب *جميع* المخازن
document.addEventListener('DOMContentLoaded', fetchAllInventories);

// ربط الاستمارات
addForm.addEventListener('submit', handleAddItem);
withdrawForm.addEventListener('submit', handleWithdrawItem);
editForm.addEventListener('submit', handleEditItem); 
editTransactionForm.addEventListener('submit', handleEditTransaction); // جديد

// ربط الفلاتر
dollarRateInput.addEventListener('change', renderTable);
dollarRateInput.addEventListener('keyup', renderTable);
searchInput.addEventListener('keyup', searchTable);
withdrawPartNameInput.addEventListener('input', showWithdrawItemDetails);

// ربط محدد المخزن الرئيسي
warehouseSelector.addEventListener('change', (e) => {
    currentWarehouseKey = e.target.value;
    renderTable(); // أعد عرض الجدول للمخزن الجديد
});

// ربط محدد المخزن في نافذة السحب (لملء الاقتراحات)
withdrawWarehouseSelect.addEventListener('change', (e) => {
    populatePartNamesDatalist(e.target.value);
    withdrawPartNameInput.value = ''; // إفراغ الحقل
    withdrawItemDetails.innerHTML = ''; // إفراغ التفاصيل
});

// ربط أزرار التعديل (تفويض الأحداث)
tableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-edit')) {
        openEditModal(event);
    }
});
// ربط أزرار تعديل الحركة (تفويض الأحداث)
document.getElementById('reportTableBody').addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-edit-tx')) {
        openEditTransactionModal(event);
    }
});

// ربط زر التصدير
document.getElementById('exportReportBtn').addEventListener('click', () => {
    exportDataToCSV(currentReportData, 'تقرير_المبيعات_بتروبارت.csv');
});
