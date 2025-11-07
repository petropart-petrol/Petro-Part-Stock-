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

// أزرار فتح النوافذ
const showAddBtn = document.getElementById('showAddForm');
const showWithdrawBtn = document.getElementById('showWithdrawForm');
const showReportBtn = document.getElementById('showReport');

// أزرار إغلاق النوافذ
const closeAddBtn = document.getElementById('closeAddModal');
const closeWithdrawBtn = document.getElementById('closeWithdrawModal');
const closeReportBtn = document.getElementById('closeReportModal');

// استمارات النماذج
const addForm = document.getElementById('addForm');
const withdrawForm = document.getElementById('withdrawForm');

// مخزن بيانات مؤقت (Cache) لتخزين بيانات المخزون لتجنب كثرة الطلبات
let inventoryData = [];

// --- 1. جلب وعرض البيانات الأساسية ---

// دالة لجلب بيانات المخزون من SheetDB
async function fetchInventory() {
    showLoading(true);
    try {
        // نستخدم ?sheet=Inventory لجلب البيانات من الصفحة المحددة
        const response = await fetch(`${SHEETDB_API_URL}?sheet=Inventory`);
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        
        inventoryData = await response.json();
        
        // فرز البيانات (اختياري) - مثلاً بالاسم
        inventoryData.sort((a, b) => (a.PartName || "").localeCompare(b.PartName || ""));
        
        renderTable(inventoryData);
        showLoading(false);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        loadingDiv.innerText = 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.';
    }
}

// دالة لعرض البيانات في الجدول
function renderTable(data) {
    tableBody.innerHTML = ''; // إفراغ الجدول أولاً
    const currentDollarRate = parseFloat(dollarRateInput.value) || 0;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">لا توجد بيانات لعرضها</td></tr>';
        return;
    }

    data.forEach(item => {
        const priceUSD = parseFloat(item.PriceUSD) || 0;
        const priceSDG = (priceUSD * currentDollarRate).toFixed(2); // حساب السعر بالجنيه

        const row = `
            <tr>
                <td>${item.PartNumber || ''}</td>
                <td>${item.PartName || ''}</td>
                <td>${item.Quantity || 0}</td>
                <td>$${priceUSD.toFixed(2)}</td>
                <td>${priceSDG} ج.س</td>
                <td>${item.LastWithdrawal || '---'}</td>
                <td>${item.LastBuyer || '---'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// دالة لتحديث الأسعار بالجنيه عند تغيير سعر الدولار
function updateSDGPrices() {
    renderTable(inventoryData); // ببساطة، أعد عرض الجدول بالبيانات المخزنة
}

// دالة البحث في الجدول
function searchTable() {
    const filter = searchInput.value.toLowerCase();
    const filteredData = inventoryData.filter(item => {
        const partName = (item.PartName || "").toLowerCase();
        const partNumber = (item.PartNumber || "").toLowerCase();
        return partName.includes(filter) || partNumber.includes(filter);
    });
    renderTable(filteredData);
}

// دالة إظهار/إخفاء رسالة التحميل
function showLoading(isLoading) {
    loadingDiv.style.display = isLoading ? 'block' : 'none';
    document.getElementById('inventoryTable').style.display = isLoading ? 'none' : 'table';
}

// --- 2. منطق إضافة قطعة غيار ---

async function handleAddItem(e) {
    e.preventDefault(); // منع إرسال الفورم

    // جلب البيانات من الفورم
    const itemData = {
        PartNumber: document.getElementById('addPartNumber').value,
        PartName: document.getElementById('addPartName').value,
        Quantity: parseInt(document.getElementById('addQuantity').value),
        PriceUSD: parseFloat(document.getElementById('addPriceUSD').value),
    };
    
    // 1. التحقق هل القطعة موجودة مسبقاً؟
    const existingItem = inventoryData.find(item => item.PartNumber === itemData.PartNumber);

    if (existingItem) {
        // إذا موجودة: نقوم بتحديث الكمية (PATCH)
        const newQuantity = parseInt(existingItem.Quantity) + itemData.Quantity;
        try {
            await updateSheetDB(`PartNumber/${itemData.PartNumber}`, { Quantity: newQuantity }, 'Inventory');
        } catch (error) {
            alert('فشل تحديث كمية القطعة الموجودة.');
            return;
        }
    } else {
        // إذا غير موجودة: نقوم بإضافة صف جديد (POST)
        try {
            await postToSheetDB([itemData], 'Inventory');
        } catch (error) {
            alert('فشل إضافة القطعة الجديدة للمخزون.');
            return;
        }
    }

    // 2. تسجيل العملية في صفحة "Transactions"
    const transactionData = {
        Timestamp: new Date().toISOString(),
        Type: 'إضافة',
        PartNumber: itemData.PartNumber,
        PartName: itemData.PartName,
        Quantity: itemData.Quantity,
        PriceUSD: itemData.PriceUSD,
    };

    try {
        await postToSheetDB([transactionData], 'Transactions');
        alert('تمت إضافة القطعة وتسجيل العملية بنجاح!');
        addForm.reset();
        closeModal(addModal);
        fetchInventory(); // إعادة تحميل الجدول
    } catch (error) {
        alert('فشل تسجيل عملية الإضافة في التقرير.');
    }
}

// --- 3. منطق سحب قطعة غيار ---

async function handleWithdrawItem(e) {
    e.preventDefault();

    const partNumber = document.getElementById('withdrawPartNumber').value;
    const quantityToWithdraw = parseInt(document.getElementById('withdrawQuantity').value);
    const buyer = document.getElementById('withdrawBuyer').value;

    if (!partNumber || quantityToWithdraw <= 0 || !buyer) {
        alert('الرجاء ملء جميع الحقول بشكل صحيح.');
        return;
    }

    // 1. البحث عن القطعة في المخزون
    const item = inventoryData.find(i => i.PartNumber === partNumber);

    if (!item) {
        alert('خطأ: رقم القطعة غير موجود في المخزون.');
        return;
    }

    const currentQuantity = parseInt(item.Quantity);
    
    if (currentQuantity < quantityToWithdraw) {
        alert(`خطأ: الكمية المطلوبة (${quantityToWithdraw}) أكبر من الكمية المتاحة (${currentQuantity}).`);
        return;
    }

    // 2. حساب الكمية الجديدة وتجهيز بيانات التحديث
    const newQuantity = currentQuantity - quantityToWithdraw;
    const withdrawalDate = new Date().toLocaleDateString('ar-EG'); // تاريخ اليوم

    const updateData = {
        Quantity: newQuantity,
        LastWithdrawal: withdrawalDate,
        LastBuyer: buyer
    };

    // 3. تحديث صفحة "Inventory" (باستخدام PATCH)
    try {
        // نستخدم PartNumber كـ "مفتاح" للبحث والتحديث
        await updateSheetDB(`PartNumber/${partNumber}`, updateData, 'Inventory');
    } catch (error) {
        alert('فشل تحديث المخزون. يرجى المحاولة مرة أخرى.');
        return;
    }

    // 4. تسجيل العملية في صفحة "Transactions"
    const currentDollarRate = parseFloat(dollarRateInput.value);
    const priceUSD = parseFloat(item.PriceUSD);
    const priceSDG = priceUSD * currentDollarRate;

    const transactionData = {
        Timestamp: new Date().toISOString(),
        Type: 'سحب',
        PartNumber: partNumber,
        PartName: item.PartName,
        Quantity: quantityToWithdraw,
        Buyer: buyer,
        PriceUSD: priceUSD,
        PriceSDG: priceSDG,
        DollarRate: currentDollarRate
    };

    try {
        await postToSheetDB([transactionData], 'Transactions');
        alert('تم السحب وتحديث المخزون بنجاح!');
        withdrawForm.reset();
        closeModal(withdrawModal);
        fetchInventory(); // إعادة تحميل الجدول
    } catch (error) {
        alert('فشل تسجيل عملية السحب في التقرير.');
    }
}

// --- 4. منطق تقرير المبيعات ---

async function handleShowReport() {
    openModal(reportModal);
    const reportBody = document.getElementById('reportTableBody');
    reportBody.innerHTML = '<tr><td colspan="8">جاري تحميل التقرير...</td></tr>';

    try {
        // جلب البيانات من صفحة "Transactions"
        const response = await fetch(`${SHEETDB_API_URL}?sheet=Transactions`);
        if (!response.ok) throw new Error('فشل جلب بيانات التقرير');
        
        const transactions = await response.json();
        
        // عرض التقرير (الأحدث أولاً)
        transactions.reverse(); 
        reportBody.innerHTML = '';

        if (transactions.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="8">لا توجد حركات مسجلة.</td></tr>';
            return;
        }

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
                    <td>${parseFloat(t.PriceSDG || 0).toFixed(2)} ج.س</td>
                    <td>${t.DollarRate || 'N/A'}</td>
                </tr>
            `;
            reportBody.innerHTML += row;
        });

    } catch (error) {
        console.error('Error fetching report:', error);
        reportBody.innerHTML = '<tr><td colspan="8">حدث خطأ أثناء تحميل التقرير.</td></tr>';
    }
}

// --- 5. دوال مساعدة (للاتصال بـ SheetDB) ---

// دالة لإرسال بيانات (POST) - (تُستخدم للإضافة)
async function postToSheetDB(data, sheetName) {
    const url = `${SHEETDB_API_URL}?sheet=${sheetName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: data }),
    });
    if (!response.ok) throw new Error('فشل في إرسال البيانات (POST)');
    return response.json();
}

// دالة لتحديث بيانات (PATCH) - (تُستخدم للسحب/التعديل)
async function updateSheetDB(searchKey, data, sheetName) {
    // searchKey مثال: "PartNumber/12345"
    const url = `${SHEETDB_API_URL}/${searchKey}?sheet=${sheetName}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: data }), // نرسل البيانات كـ object واحد
    });
    if (!response.ok) throw new Error('فشل في تحديث البيانات (PATCH)');
    return response.json();
}


// --- 6. إدارة النوافذ المنبثقة (Modals) ---

function openModal(modal) {
    modal.style.display = 'block';
}

function closeModal(modal) {
    modal.style.display = 'none';
}

// ربط أزرار فتح النوافذ
showAddBtn.onclick = () => openModal(addModal);
showWithdrawBtn.onclick = () => openModal(withdrawModal);
showReportBtn.onclick = () => handleShowReport(); // جلب التقرير عند الفتح

// ربط أزرار إغلاق النوافذ
closeAddBtn.onclick = () => closeModal(addModal);
closeWithdrawBtn.onclick = () => closeModal(withdrawModal);
closeReportBtn.onclick = () => closeModal(reportModal);

// إغلاق النافذة عند الضغط خارجها
window.onclick = function(event) {
    if (event.target == addModal) closeModal(addModal);
    if (event.target == withdrawModal) closeModal(withdrawModal);
    if (event.target == reportModal) closeModal(reportModal);
}

// --- 7. ربط الأحداث ---

// عند تحميل الصفحة، ابدأ بجلب البيانات
document.addEventListener('DOMContentLoaded', fetchInventory);

// ربط استمارات الإضافة والسحب
addForm.addEventListener('submit', handleAddItem);
withdrawForm.addEventListener('submit', handleWithdrawItem);

// ربط حقل سعر الدولار وحقل البحث
dollarRateInput.addEventListener('change', updateSDGPrices);
dollarRateInput.addEventListener('keyup', updateSDGPrices);
searchInput.addEventListener('keyup', searchTable);