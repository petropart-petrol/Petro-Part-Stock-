// -----------------------------------------------------------------

// ⚠️ !! هام جداً: غيّر هذا الرابط بالرابط الخاص بك من SheetDB !! ⚠️

const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/toxu6mq5ih3gc';

// -----------------------------------------------------------------



// عناصر الصفحة الرئيسية

const tableBody = document.getElementById('tableBody');

const loadingDiv = document.getElementById('loading');

const dollarRateInput = document.getElementById('dollarRate');

const searchInput = document.getElementById('searchInput');



// عناصر النوافذ (Modals)

const addModal = document.getElementById('addModal');

const withdrawModal = document.getElementById('withdrawModal');

const reportModal = document.getElementById('reportModal');

const editModal = document.getElementById('editModal'); 



// أزرار فتح النوافذ

const showAddBtn = document.getElementById('showAddForm');

const showWithdrawBtn = document.getElementById('showWithdrawForm');

const showReportBtn = document.getElementById('showReport');



// أزرار إغلاق النوافذ

const closeAddBtn = document.getElementById('closeAddModal');

const closeWithdrawBtn = document.getElementById('closeWithdrawModal');

const closeReportBtn = document.getElementById('closeReportModal');

const closeEditModalBtn = document.getElementById('closeEditModal'); 



// استمارات النماذج

const addForm = document.getElementById('addForm');

const withdrawForm = document.getElementById('withdrawForm');

const editForm = document.getElementById('editForm'); 



// عناصر السحب والتقرير

const withdrawPartNameInput = document.getElementById('withdrawPartName');

const withdrawItemDetails = document.getElementById('withdrawItemDetails');

const reportSummaryContent = document.getElementById('summaryContent');



// مخزن بيانات مؤقت (Cache)

let inventoryData = [];

// إضافة: مخزن لبيانات التقرير الحالي (للتصدير)

let currentReportData = [];



// --- 1. جلب وعرض البيانات الأساسية ---



async function fetchInventory() {

    showLoading(true);

    try {

        const response = await fetch(`${SHEETDB_API_URL}?sheet=Inventory`);

        if (!response.ok) throw new Error('فشل في جلب البيانات');

        

        inventoryData = await response.json();

        inventoryData.sort((a, b) => (parseInt(a.PartNumber) || 0) - (parseInt(b.PartNumber) || 0));

        

        populatePartNamesDatalist();

        renderTable(inventoryData);

        showLoading(false);

    } catch (error) {

        console.error('Error fetching inventory:', error);

        loadingDiv.innerText = 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.';

    }

}



// تم تعديل renderTable (حذف "ت" وتعديل colspan)

function renderTable(data) {

    tableBody.innerHTML = ''; 

    const currentDollarRate = parseFloat(dollarRateInput.value) || 0;



    if (data.length === 0) {

        // تعديل: تم تغيير colspan من 7 إلى 6

        tableBody.innerHTML = '<tr><td colspan="6">لا توجد بيانات لعرضها</td></tr>';

        return;

    }



    data.forEach((item) => { // حذف "index"

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



function updateSDGPrices() {

    searchTable(); 

}



function searchTable() {

    const filter = searchInput.value.toLowerCase();

    const filteredData = inventoryData.filter(item => {

        const partName = (item.PartName || "").toLowerCase();

        return partName.includes(filter);

    });

    renderTable(filteredData);

}



function showLoading(isLoading) {

    loadingDiv.style.display = isLoading ? 'block' : 'none';

    document.getElementById('inventoryTable').style.display = isLoading ? 'none' : 'table';

}



function populatePartNamesDatalist() {

    const datalist = document.getElementById('partNamesList');

    datalist.innerHTML = ''; 

    const partNames = new Set(inventoryData.map(item => item.PartName.trim()));

    partNames.forEach(name => {

        if (name) {

            const option = document.createElement('option');

            option.value = name;

            datalist.appendChild(option);

        }

    });

}



// --- 2. منطق إضافة قطعة غيار ---

// (لم يتغير)

async function handleAddItem(e) {

    e.preventDefault(); 

    const itemData = {

        PartName: document.getElementById('addPartName').value.trim(),

        Quantity: parseInt(document.getElementById('addQuantity').value),

        PriceUSD: parseFloat(document.getElementById('addPriceUSD').value),

    };

    if (!itemData.PartName || itemData.Quantity <= 0 || itemData.PriceUSD <= 0) { alert("الرجاء إدخال اسم وكمية وسعر صحيحين."); return; }

    const existingItem = inventoryData.find(item => item.PartName.toLowerCase() === itemData.PartName.toLowerCase());

    let partNumberToLog;

    if (existingItem) {

        const newQuantity = parseInt(existingItem.Quantity) + itemData.Quantity;

        partNumberToLog = existingItem.PartNumber; 

        try { await updateSheetDB(`PartNumber/${existingItem.PartNumber}`, { Quantity: newQuantity }, 'Inventory'); } 

        catch (error) { alert('فشل تحديث كمية القطعة الموجودة.'); return; }

    } else {

        const maxId = Math.max(0, ...inventoryData.map(item => parseInt(item.PartNumber) || 0));

        const newPartNumber = maxId + 1;

        partNumberToLog = newPartNumber; 

        const newItem = { ...itemData, PartNumber: newPartNumber };

        try { await postToSheetDB([newItem], 'Inventory'); } 

        catch (error) { alert('فشل إضافة القطعة الجديدة للمخزون.'); return; }

    }

    const transactionData = {

        Timestamp: new Date().toISOString(), Type: 'إضافة', PartNumber: partNumberToLog, 

        PartName: itemData.PartName, Quantity: itemData.Quantity, PriceUSD: itemData.PriceUSD,

    };

    try {

        await postToSheetDB([transactionData], 'Transactions');

        alert('تمت إضافة/تحديث القطعة وتسجيل العملية بنجاح!');

        addForm.reset(); closeModal(addModal); fetchInventory();

    } catch (error) { alert('فشل تسجيل عملية الإضافة في التقرير.'); }

}



// --- 3. منطق سحب قطعة غيار (تم تعديله) ---



function showWithdrawItemDetails() {

    const partName = withdrawPartNameInput.value.toLowerCase().trim();

    if (!partName) { withdrawItemDetails.innerHTML = ''; return; }

    const item = inventoryData.find(i => i.PartName.toLowerCase().trim() === partName);

    if (item) { withdrawItemDetails.innerHTML = `القطعة: ${item.PartName} - الكمية المتاحة: <span class="text-success">${item.Quantity}</span>`; } 

    else { withdrawItemDetails.innerHTML = `<span class="text-danger">القطعة غير موجودة</span>`; }

}



async function handleWithdrawItem(e) {

    e.preventDefault();

    const partName = withdrawPartNameInput.value.trim();

    const quantityToWithdraw = parseInt(document.getElementById('withdrawQuantity').value);

    const buyer = document.getElementById('withdrawBuyer').value.trim();

    const location = document.getElementById('withdrawLocation').value.trim(); 

    // إضافة: جلب السعر الحقيقي

    const actualSDG = parseFloat(document.getElementById('withdrawActualSDG').value) || 0;



    if (!partName || quantityToWithdraw <= 0 || !buyer) { alert('الرجاء ملء حقول الاسم والكمية واسم المشتري بشكل صحيح.'); return; }

    const item = inventoryData.find(i => i.PartName.toLowerCase().trim() === partName.toLowerCase());

    if (!item) { alert('خطأ: اسم القطعة غير موجود في المخزون.'); return; }

    const currentQuantity = parseInt(item.Quantity);

    if (currentQuantity < quantityToWithdraw) { alert(`خطأ: الكمية المطلوبة (${quantityToWithdraw}) أكبر من الكمية المتاحة (${currentQuantity}).`); return; }



    const newQuantity = currentQuantity - quantityToWithdraw;

    const updateData = { Quantity: newQuantity };

    try { await updateSheetDB(`PartNumber/${item.PartNumber}`, updateData, 'Inventory'); } 

    catch (error) { alert('فشل تحديث المخزون. يرجى المحاولة مرة أخرى.'); return; }



    const currentDollarRate = parseFloat(dollarRateInput.value);

    const priceUSD = parseFloat(item.PriceUSD);

    const totalUSD = priceUSD * quantityToWithdraw;

    

    // تعديل: منطق حساب السعر بالجنيه

    // إذا أدخل المستخدم سعراً حقيقياً (أكبر من صفر)، استخدمه. وإلا، احسبه.

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

        PriceSDG: priceSDG, // استخدام السعر النهائي

        DollarRate: currentDollarRate

    };



    try {

        await postToSheetDB([transactionData], 'Transactions');

        alert('تم السحب وتحديث المخزون بنجاح!');

        withdrawForm.reset();

        withdrawItemDetails.innerHTML = ''; 

        closeModal(withdrawModal);

        fetchInventory();

    } catch (error) {

        alert('فشل تسجيل عملية السحب في التقرير.');

    }

}



// --- 4. منطق تقرير المبيعات (تم تعديله) ---



async function handleShowReport() {

    openModal(reportModal);

    const reportBody = document.getElementById('reportTableBody');

    const summaryDiv = document.getElementById('summaryContent');

    

    // تعديل: زيادة الـ colspan ليناسب العمود الجديد (9 أعمدة)

    reportBody.innerHTML = '<tr><td colspan="9">جاري تحميل التقرير...</td></tr>';

    summaryDiv.innerHTML = '<p>جاري حساب الإحصائيات...</p>';

    currentReportData = []; // إفراغ البيانات القديمة



    try {

        const response = await fetch(`${SHEETDB_API_URL}?sheet=Transactions`);

        if (!response.ok) throw new Error('فشل جلب بيانات التقرير');

        

        const transactions = await response.json();

        currentReportData = transactions; // تخزين البيانات للتصدير

        

        const withdrawals = transactions.filter(t => t.Type === 'سحب');



        // ... (منطق الإحصائيات لم يتغير) ...

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

                    <td>${t.PartNumber}</td>

                    <td>${t.PartName}</td>

                    <td>${t.Quantity}</td>

                    <td>${t.Buyer || '---'}</td>

                    <td>${t.BuyerLocation || '---'}</td>

                    <td>${parseFloat(t.PriceSDG || 0).toFixed(2)} ج.س</td>

                    <td>${t.DollarRate || 'N/A'}</td>

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



// --- 5. دوال مساعدة (للاتصال بـ SheetDB) ---

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



// --- 6. إدارة النوافذ المنبثقة (Modals) ---

function openModal(modal) { modal.style.display = 'block'; }

function closeModal(modal) { modal.style.display = 'none'; }

function openEditModal(event) {

    const button = event.target;

    document.getElementById('editPartNumber').value = button.dataset.partnumber;

    document.getElementById('editPartName').value = button.dataset.name;

    document.getElementById('editQuantity').value = button.dataset.quantity;

    document.getElementById('editPriceUSD').value = button.dataset.price;

    openModal(editModal);

}

async function handleEditItem(e) {

    e.preventDefault();

    const partNumber = document.getElementById('editPartNumber').value;

    const updatedData = {

        PartName: document.getElementById('editPartName').value,

        Quantity: document.getElementById('editQuantity').value,

        PriceUSD: document.getElementById('editPriceUSD').value

    };

    if (!updatedData.PartName || updatedData.Quantity < 0 || updatedData.PriceUSD < 0) { alert('الرجاء ملء جميع الحقول بشكل صحيح.'); return; }

    try {

        await updateSheetDB(`PartNumber/${partNumber}`, updatedData, 'Inventory');

        alert('تم تعديل القطعة بنجاح!');

        closeModal(editModal);

        fetchInventory(); 

    } catch (error) { console.error('Error updating item:', error); alert('فشل في تعديل القطعة.'); }

}



showAddBtn.onclick = () => openModal(addModal);

showWithdrawBtn.onclick = () => openModal(withdrawModal);

showReportBtn.onclick = () => handleShowReport(); 

closeAddBtn.onclick = () => closeModal(addModal);

closeEditModalBtn.onclick = () => closeModal(editModal); 

closeWithdrawBtn.onclick = () => { closeModal(withdrawModal); withdrawItemDetails.innerHTML = ''; withdrawForm.reset(); };

closeReportBtn.onclick = () => closeModal(reportModal);

window.onclick = function(event) {

    if (event.target == addModal) closeModal(addModal);

    if (event.target == reportModal) closeModal(reportModal);

    if (event.target == editModal) closeModal(editModal); 

    if (event.target == withdrawModal) { closeModal(withdrawModal); withdrawItemDetails.innerHTML = ''; withdrawForm.reset(); }

}



// --- إضافة: دالة تصدير التقرير إلى CSV (يفتحها Excel) ---

function exportDataToCSV(data, filename) {

    if (data.length === 0) {

        alert('لا توجد بيانات لتصديرها.');

        return;

    }



    // تحديد الأعمدة (يجب أن تطابق الأسماء في كائن التقرير)

    const headers = [

        "Timestamp", "Type", "PartNumber", "PartName", 

        "Quantity", "Buyer", "BuyerLocation", 

        "PriceUSD", "PriceSDG", "DollarRate"

    ];

    

    // دالة مساعدة للتعامل مع الفواصل والنصوص

    const escapeCSV = (str) => {

        if (str === null || str === undefined) str = "";

        str = String(str);

        if (str.includes(',') || str.includes('"') || str.includes('\n')) {

            return `"${str.replace(/"/g, '""')}"`; // وضع النص بين علامتي اقتباس مزدوجة

        }

        return str;

    };



    // بناء محتوى CSV

    // \ufeff هو (BOM) لضمان أن Excel يقرأ اللغة العربية بشكل صحيح

    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; 

    csvContent += headers.join(",") + "\n"; // إضافة العناوين



    data.forEach(row => {

        const rowData = headers.map(header => escapeCSV(row[header]));

        csvContent += rowData.join(",") + "\n";

    });



    // إنشاء رابط وتنزيل الملف

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);

    link.setAttribute("download", filename);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

}





// --- 7. ربط الأحداث ---

document.addEventListener('DOMContentLoaded', fetchInventory);

addForm.addEventListener('submit', handleAddItem);

withdrawForm.addEventListener('submit', handleWithdrawItem);

editForm.addEventListener('submit', handleEditItem); 

dollarRateInput.addEventListener('change', updateSDGPrices);

dollarRateInput.addEventListener('keyup', updateSDGPrices);

searchInput.addEventListener('keyup', searchTable);

withdrawPartNameInput.addEventListener('input', showWithdrawItemDetails);



tableBody.addEventListener('click', (event) => {

    if (event.target.classList.contains('btn-edit')) {

        openEditModal(event);

    }

});



// إضافة: ربط زر التصدير

document.getElementById('exportReportBtn').addEventListener('click', () => {

    // نستخدم البيانات المخزنة في "currentReportData"

    exportDataToCSV(currentReportData, 'تقرير_المبيعات_بتروبارت.csv');

});
