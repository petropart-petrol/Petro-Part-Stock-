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



// عناصر جديدة

const withdrawPartNameInput = document.getElementById('withdrawPartName');

const withdrawItemDetails = document.getElementById('withdrawItemDetails');

const reportSummaryContent = document.getElementById('summaryContent');



// مخزن بيانات مؤقت (Cache)

let inventoryData = [];



// --- 1. جلب وعرض البيانات الأساسية ---



async function fetchInventory() {

    showLoading(true);

    try {

        const response = await fetch(`${SHEETDB_API_URL}?sheet=Inventory`);

        if (!response.ok) throw new Error('فشل في جلب البيانات');

        

        inventoryData = await response.json();

        inventoryData.sort((a, b) => (a.PartName || "").localeCompare(b.PartName || ""));

        

        renderTable(inventoryData);

        showLoading(false);

    } catch (error) {

        console.error('Error fetching inventory:', error);

        loadingDiv.innerText = 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.';

    }

}



function renderTable(data) {

    tableBody.innerHTML = ''; 

    const currentDollarRate = parseFloat(dollarRateInput.value) || 0;



    if (data.length === 0) {

        tableBody.innerHTML = '<tr><td colspan="7">لا توجد بيانات لعرضها</td></tr>';

        return;

    }



    data.forEach(item => {

        const priceUSD = parseFloat(item.PriceUSD) || 0;

        const priceSDG = (priceUSD * currentDollarRate).toFixed(2); 



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



function updateSDGPrices() {

    // نستخدم البيانات التي تم بحث عنها مؤخراً (أو البيانات الكاملة)

    searchTable(); 

}



// دالة البحث (تم التعديل: البحث بالاسم فقط)

function searchTable() {

    const filter = searchInput.value.toLowerCase();

    const filteredData = inventoryData.filter(item => {

        const partName = (item.PartName || "").toLowerCase();

        // تم إزالة البحث برقم القطعة

        return partName.includes(filter);

    });

    renderTable(filteredData);

}



function showLoading(isLoading) {

    loadingDiv.style.display = isLoading ? 'block' : 'none';

    document.getElementById('inventoryTable').style.display = isLoading ? 'none' : 'table';

}



// --- 2. منطق إضافة قطعة غيار (تم تعديله) ---



async function handleAddItem(e) {

    e.preventDefault(); 



    // جلب البيانات من الفورم (بدون رقم القطعة)

    const itemData = {

        PartName: document.getElementById('addPartName').value.trim(),

        Quantity: parseInt(document.getElementById('addQuantity').value),

        PriceUSD: parseFloat(document.getElementById('addPriceUSD').value),

    };

    

    if (!itemData.PartName || itemData.Quantity <= 0 || itemData.PriceUSD <= 0) {

        alert("الرجاء إدخال اسم وكمية وسعر صحيحين.");

        return;

    }



    // 1. التحقق هل القطعة موجودة مسبقاً (بـ "الاسم")؟

    const existingItem = inventoryData.find(item => 

        item.PartName.toLowerCase() === itemData.PartName.toLowerCase()

    );



    let partNumberToLog;



    if (existingItem) {

        // إذا موجودة: نقوم بتحديث الكمية (PATCH)

        const newQuantity = parseInt(existingItem.Quantity) + itemData.Quantity;

        partNumberToLog = existingItem.PartNumber; // استخدم الرقم القديم للتسجيل

        try {

            // نستخدم رقم القطعة الموجود كـ "مفتاح" للتحديث

            await updateSheetDB(`PartNumber/${existingItem.PartNumber}`, { Quantity: newQuantity }, 'Inventory');

        } catch (error) {

            alert('فشل تحديث كمية القطعة الموجودة.');

            return;

        }

    } else {

        // إذا غير موجودة: نقوم بإنشاء رقم تلقائي وإضافة صف جديد (POST)

        

        // 2. إنشاء رقم قطعة تلقائي

        const maxId = Math.max(0, ...inventoryData.map(item => parseInt(item.PartNumber) || 0));

        const newPartNumber = maxId + 1;

        partNumberToLog = newPartNumber; // استخدم الرقم الجديد للتسجيل



        const newItem = {

            ...itemData,

            PartNumber: newPartNumber

        };

        

        try {

            await postToSheetDB([newItem], 'Inventory');

        } catch (error) {

            alert('فشل إضافة القطعة الجديدة للمخزون.');

            return;

        }

    }



    // 3. تسجيل العملية في صفحة "Transactions"

    const transactionData = {

        Timestamp: new Date().toISOString(),

        Type: 'إضافة',

        PartNumber: partNumberToLog, // الرقم الذي تم استخدامه

        PartName: itemData.PartName,

        Quantity: itemData.Quantity,

        PriceUSD: itemData.PriceUSD,

    };



    try {

        await postToSheetDB([transactionData], 'Transactions');

        alert('تمت إضافة/تحديث القطعة وتسجيل العملية بنجاح!');

        addForm.reset();

        closeModal(addModal);

        fetchInventory(); // إعادة تحميل الجدول

    } catch (error) {

        alert('فشل تسجيل عملية الإضافة في التقرير.');

    }

}



// --- 3. منطق سحب قطعة غيار (تم تعديله) ---



// دالة مساعدة لإظهار تفاصيل القطعة عند الكتابة في فورم السحب

// دالة مساعدة لإظهار تفاصيل القطعة عند الكتابة في فورم السحب
function showWithdrawItemDetails() {
    const partName = withdrawPartNameInput.value.toLowerCase().trim(); // نستخدم trim لإزالة المسافات
    if (!partName) {
        withdrawItemDetails.innerHTML = ''; // إفراغ الحقل إذا كان فارغاً
        return;
    }
    
    // ابحث في البيانات المخزنة مؤقتاً
    const item = inventoryData.find(i => i.PartName.toLowerCase() === partName);

    if (item) {
        // وجدنا القطعة
        withdrawItemDetails.innerHTML = `القطعة: ${item.PartName} - الكمية المتاحة: <span class="text-success">${item.Quantity}</span>`;
    } else {
        // لم نجد القطعة
        withdrawItemDetails.innerHTML = `<span class="text-danger">القطعة غير موجودة</span>`;
    }
}

async function handleWithdrawItem(e) {

    e.preventDefault();



    const partName = withdrawPartNameInput.value.trim();

    const quantityToWithdraw = parseInt(document.getElementById('withdrawQuantity').value);

    const buyer = document.getElementById('withdrawBuyer').value.trim();



    if (!partName || quantityToWithdraw <= 0 || !buyer) {

        alert('الرجاء ملء جميع الحقول بشكل صحيح.');

        return;

    }



    // 1. البحث عن القطعة في المخزون (باستخدام الاسم)

    const item = inventoryData.find(i => i.PartName.toLowerCase() === partName.toLowerCase());



    if (!item) {

        alert('خطأ: اسم القطعة غير موجود في المخزون.');

        return;

    }



    const currentQuantity = parseInt(item.Quantity);

    

    if (currentQuantity < quantityToWithdraw) {

        alert(`خطأ: الكمية المطلوبة (${quantityToWithdraw}) أكبر من الكمية المتاحة (${currentQuantity}).`);

        return;

    }



    // 2. حساب الكمية الجديدة وتجهيز بيانات التحديث

    const newQuantity = currentQuantity - quantityToWithdraw;

    const withdrawalDate = new Date().toLocaleDateString('ar-EG'); 



    const updateData = {

        Quantity: newQuantity,

        LastWithdrawal: withdrawalDate,

        LastBuyer: buyer

    };



    // 3. تحديث صفحة "Inventory" (باستخدام PartNumber كـ "مفتاح")

    try {

        await updateSheetDB(`PartNumber/${item.PartNumber}`, updateData, 'Inventory');

    } catch (error) {

        alert('فشل تحديث المخزون. يرجى المحاولة مرة أخرى.');

        return;

    }



    // 4. تسجيل العملية في صفحة "Transactions"

    const currentDollarRate = parseFloat(dollarRateInput.value);

    const priceUSD = parseFloat(item.PriceUSD);

    const priceSDG = priceUSD * quantityToWithdraw * currentDollarRate; // السعر الإجمالي بالجنيه

    const totalUSD = priceUSD * quantityToWithdraw; // السعر الإجمالي بالدولار



    const transactionData = {

        Timestamp: new Date().toISOString(),

        Type: 'سحب',

        PartNumber: item.PartNumber,

        PartName: item.PartName,

        Quantity: quantityToWithdraw,

        Buyer: buyer,

        PriceUSD: totalUSD, // تسجيل السعر الإجمالي للعملية

        PriceSDG: priceSDG, // تسجيل السعر الإجمالي للعملية

        DollarRate: currentDollarRate

    };



    try {

        await postToSheetDB([transactionData], 'Transactions');

        alert('تم السحب وتحديث المخزون بنجاح!');

        withdrawForm.reset();

        withdrawItemDetails.innerHTML = ''; // إفراغ المساعد

        closeModal(withdrawModal);

        fetchInventory(); // إعادة تحميل الجدول

    } catch (error) {

        alert('فشل تسجيل عملية السحب في التقرير.');

    }

}



// --- 4. منطق تقرير المبيعات (تم تعديله) ---



async function handleShowReport() {

    openModal(reportModal);

    const reportBody = document.getElementById('reportTableBody');

    const summaryDiv = document.getElementById('summaryContent');

    

    reportBody.innerHTML = '<tr><td colspan="8">جاري تحميل التقرير...</td></tr>';

    summaryDiv.innerHTML = '<p>جاري حساب الإحصائيات...</p>';



    try {

        // جلب البيانات من صفحة "Transactions"

        const response = await fetch(`${SHEETDB_API_URL}?sheet=Transactions`);

        if (!response.ok) throw new Error('فشل جلب بيانات التقرير');

        

        const transactions = await response.json();

        const withdrawals = transactions.filter(t => t.Type === 'سحب');



        // 1. حساب الإحصائيات

        let totalUSD = 0;

        let totalSDG = 0;

        const buyerSales = {}; // { 'اسم المشتري': إجمالي الدولارات }

        const partSales = {}; // { 'اسم القطعة': إجمالي الكمية }



        withdrawals.forEach(t => {

            const saleUSD = parseFloat(t.PriceUSD) || 0;

            const saleSDG = parseFloat(t.PriceSDG) || 0;

            const quantity = parseInt(t.Quantity) || 0;



            // إجمالي المبيعات

            totalUSD += saleUSD;

            totalSDG += saleSDG;



            // تجميع مبيعات المشترين

            if (t.Buyer) {

                buyerSales[t.Buyer] = (buyerSales[t.Buyer] || 0) + saleUSD;

            }



            // تجميع القطع الأكثر مبيعاً (بالكمية)

            if (t.PartName) {

                partSales[t.PartName] = (partSales[t.PartName] || 0) + quantity;

            }

        });



        // 2. فرز الإحصائيات لإيجاد "الأكثر"

        const sortedBuyers = Object.entries(buyerSales).sort((a, b) => b[1] - a[1]);

        const sortedParts = Object.entries(partSales).sort((a, b) => b[1] - a[1]);



        const topBuyer = sortedBuyers.length > 0 ? `${sortedBuyers[0][0]} (بقيمة $${sortedBuyers[0][1].toFixed(2)})` : 'لا يوجد';

        const topPart = sortedParts.length > 0 ? `${sortedParts[0][0]} (بكمية ${sortedParts[0][1]})` : 'لا يوجد';



        // 3. عرض ملخص الإحصائيات

        summaryDiv.innerHTML = `

            <p><strong>إجمالي المبيعات (دولار):</strong> <span class="text-success">$${totalUSD.toFixed(2)}</span></p>

            <p><strong>إجمالي المبيعات (جنيه):</strong> <span class="text-success">${totalSDG.toFixed(2)} ج.س</span></p>

            <p><strong>المشتري الأكثر مبيعاً:</strong> ${topBuyer}</p>

            <p><strong>القطعة الأكثر مبيعاً:</strong> ${topPart}</p>

        `;



        // 4. عرض سجل الحركات المفصل (الأحدث أولاً)

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

        summaryDiv.innerHTML = '<p class="text-danger">فشل تحميل الإحصائيات.</p>';

    }

}



// --- 5. دوال مساعدة (للاتصال بـ SheetDB) ---



async function postToSheetDB(data, sheetName) {

    const url = `${SHEETDB_API_URL}?sheet=${sheetName}`;

    const response = await fetch(url, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ data: data }),

    });

    if (!response.ok) throw new Error('فشل في إرسال البيانات (POST)');

    return response.json();

}



async function updateSheetDB(searchKey, data, sheetName) {

    const url = `${SHEETDB_API_URL}/${searchKey}?sheet=${sheetName}`;

    const response = await fetch(url, {

        method: 'PATCH',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ data: data }), 

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

showReportBtn.onclick = () => handleShowReport(); 



// ربط أزرار إغلاق النوافذ

closeAddBtn.onclick = () => closeModal(addModal);

closeWithdrawBtn.onclick = () => {

    closeModal(withdrawModal);

    withdrawItemDetails.innerHTML = ''; // تنظيف المساعد عند الإغلاق

    withdrawForm.reset();

};

closeReportBtn.onclick = () => closeModal(reportModal);



window.onclick = function(event) {

    if (event.target == addModal) closeModal(addModal);

    if (event.target == reportModal) closeModal(reportModal);

    if (event.target == withdrawModal) {

        closeModal(withdrawModal);

        withdrawItemDetails.innerHTML = ''; // تنظيف المساعد عند الإغلاق

        withdrawForm.reset();

    }

}



// --- 7. ربط الأحداث ---



document.addEventListener('DOMContentLoaded', fetchInventory);



// ربط استمارات الإضافة والسحب

addForm.addEventListener('submit', handleAddItem);

withdrawForm.addEventListener('submit', handleWithdrawItem);



// ربط حقل سعر الدولار وحقل البحث

dollarRateInput.addEventListener('change', updateSDGPrices);

dollarRateInput.addEventListener('keyup', updateSDGPrices);

searchInput.addEventListener('keyup', searchTable);



// ربط حقل السحب بالاسم لإظهار التفاصيل

withdrawPartNameInput.addEventListener('input', showWithdrawItemDetails);

