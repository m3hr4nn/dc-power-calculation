// Global variables to store device data and chart instance
let itDevicesData = [];
let infraDevicesData = [];
let powerChart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupFileUploadHandlers();
});

// Set up CSV upload handlers
function setupFileUploadHandlers() {
    document.getElementById('itDevicesFile').addEventListener('change', e => handleFileUpload(e, 'it'));
    document.getElementById('infraDevicesFile').addEventListener('change', e => handleFileUpload(e, 'infra'));
}

// Handle CSV file upload and parsing
function handleFileUpload(event, type) {
    const file = event.target.files[0];
    const statusEl = document.getElementById(`${type}Status`);
    if (!file) return;
    if (file.type !== 'text/csv') {
        showStatus(statusEl, 'Please select a CSV file', 'error');
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: results => {
            if (results.errors.length) {
                showStatus(statusEl, `Error parsing CSV: ${results.errors[0].message}`, 'error');
                return;
            }
            const data = results.data;
            if (!validateCSVData(data, type)) {
                showStatus(statusEl, 'Invalid CSV format. Please check the template.', 'error');
                return;
            }
            if (type === 'it') itDevicesData = data;
            else infraDevicesData = data;

            showStatus(statusEl, `✅ ${data.length} devices loaded successfully`, 'success');
            updateDevicesList(type, data);

            if (itDevicesData.length && infraDevicesData.length) {
                document.getElementById('calculatorSection').style.display = 'block';
                calculatePower();  // initial draw
            }
        },
        error: err => showStatus(statusEl, `Error reading file: ${err.message}`, 'error')
    });
}

// Validate CSV has required columns
function validateCSVData(data, type) {
    if (!data.length) return false;
    const cols = type === 'it'
        ? ['device_brand','model','type_of_ne','maximum_power_usage_watts','nominal_power_usage_watts','count']
        : ['device_brand','model','type_of_device','maximum_power_usage_watts','nominal_power_usage_watts','weight_kg','count'];
    return cols.every(c => c in data[0]);
}

// Show status message
function showStatus(el, msg, cls) {
    el.textContent = msg;
    el.className = `status ${cls}`;
}

// Build device selection lists
function updateDevicesList(type, data) {
    const container = document.getElementById(`${type}DevicesList`);
    container.innerHTML = '';
    data.forEach((dev, idx) => container.appendChild(createDeviceElement(dev, type, idx)));
}

// Create individual device entry
function createDeviceElement(device, type, idx) {
    const div = document.createElement('div');
    div.className = 'device-item';
    const typeField = type === 'it' ? 'type_of_ne' : 'type_of_device';
    div.innerHTML = `
        <div class="device-header">
            <div class="device-name">${device.device_brand} ${device.model}</div>
            <div class="device-type">${device[typeField]}</div>
        </div>
        <div class="device-details">
            Max: ${device.maximum_power_usage_watts}W | Nominal: ${device.nominal_power_usage_watts}W
            ${type==='infra'?`| Weight: ${device.weight_kg}kg`:``}
        </div>
        <div class="device-count">
            <label>Qty:</label>
            <input type="number" min="0" value="${device.count||0}"
                   onchange="updateDeviceCount('${type}', ${idx}, this.value)" />
        </div>`;
    return div;
}

// Update device count and recalculate
function updateDeviceCount(type, idx, val) {
    const data = type==='it'? itDevicesData : infraDevicesData;
    data[idx].count = parseInt(val) || 0;
    calculatePower();
}

// Main calculation routine
function calculatePower() {
    const res = {
        itDevices: [], infraDevices: [],
        itNominal:0, itMaximum:0,
        infraNominal:0, infraMaximum:0,
        totalNominal:0, totalMaximum:0
    };

    // Sum IT
    itDevicesData.forEach(d => {
        if (d.count>0) {
            const nom = d.nominal_power_usage_watts*d.count/1000;
            const max = d.maximum_power_usage_watts*d.count/1000;
            res.itDevices.push({...d, totalNominal:nom, totalMaximum:max});
            res.itNominal += nom; res.itMaximum += max;
        }
    });

    // Sum Infra
    infraDevicesData.forEach(d => {
        if (d.count>0) {
            const nom = d.nominal_power_usage_watts*d.count/1000;
            const max = d.maximum_power_usage_watts*d.count/1000;
            res.infraDevices.push({...d, totalNominal:nom, totalMaximum:max});
            res.infraNominal += nom; res.infraMaximum += max;
        }
    });

    res.totalNominal = res.itNominal + res.infraNominal;
    res.totalMaximum = res.itMaximum + res.infraMaximum;
    window.calculationResults = res;

    displayResults(res);
    updatePowerChart(res);
}

// Display numeric results and table
function displayResults(r) {
    document.getElementById('itNominal').textContent    = `${r.itNominal.toFixed(2)} kW`;
    document.getElementById('itMaximum').textContent    = `${r.itMaximum.toFixed(2)} kW`;
    document.getElementById('infraNominal').textContent = `${r.infraNominal.toFixed(2)} kW`;
    document.getElementById('infraMaximum').textContent = `${r.infraMaximum.toFixed(2)} kW`;
    document.getElementById('totalNominal').textContent = `${r.totalNominal.toFixed(2)} kW`;
    document.getElementById('totalMaximum').textContent = `${r.totalMaximum.toFixed(2)} kW`;

    // Detailed table
    const tbl = document.getElementById('detailedTable');
    let html = `<table class="results-table">
        <thead><tr>
            <th>Cat</th><th>Brand</th><th>Model</th><th>Type</th>
            <th>Qty</th><th>Unit Nom(W)</th><th>Unit Max(W)</th>
            <th>Total Nom(kW)</th><th>Total Max(kW)</th>
        </tr></thead><tbody>`;
    r.itDevices.forEach(d => {
        html+= `<tr class="category-it"><td>IT</td><td>${d.device_brand}</td><td>${d.model}</td>
            <td>${d.type_of_ne}</td><td>${d.count}</td>
            <td>${d.nominal_power_usage_watts}</td>
            <td>${d.maximum_power_usage_watts}</td>
            <td>${d.totalNominal.toFixed(2)}</td>
            <td>${d.totalMaximum.toFixed(2)}</td></tr>`;
    });
    r.infraDevices.forEach(d => {
        html+= `<tr class="category-infra"><td>Infra</td><td>${d.device_brand}</td><td>${d.model}</td>
            <td>${d.type_of_device}</td><td>${d.count}</td>
            <td>${d.nominal_power_usage_watts}</td>
            <td>${d.maximum_power_usage_watts}</td>
            <td>${d.totalNominal.toFixed(2)}</td>
            <td>${d.totalMaximum.toFixed(2)}</td></tr>`;
    });
    html += `<tr class="total-row">
        <td colspan="7"><strong>TOTAL</strong></td>
        <td><strong>${r.totalNominal.toFixed(2)}</strong></td>
        <td><strong>${r.totalMaximum.toFixed(2)}</strong></td>
    </tr></tbody></table>`;
    tbl.innerHTML = html;

    document.getElementById('resultsContainer').style.display = 'block';
}

// Draw/Update Chart.js bar chart
function updatePowerChart(r) {
    const ctx = document.getElementById('powerChart').getContext('2d');
    const labels = ['Nominal','Maximum'];
    const data  = [r.totalNominal, r.totalMaximum];

    if (powerChart) powerChart.destroy();
    powerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total kW',
                data,
                backgroundColor: ['rgba(52,152,219,0.6)','rgba(231,76,60,0.6)']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Export report to PDF including the chart image
function exportToPDF() {
    const results = window.calculationResults;
    if (!results) { alert('Calculate first'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title & date
    doc.setFontSize(20).text('Datacenter Power Consumption Report', 20, 20);
    doc.setFontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

    // Summary
    doc.setFontSize(16).text('Summary', 20, 45);
    doc.setFontSize(12)
       .text(`IT Nominal: ${results.itNominal.toFixed(2)} kW`, 20, 55)
       .text(`IT Maximum: ${results.itMaximum.toFixed(2)} kW`, 20, 63)
       .text(`Infra Nominal: ${results.infraNominal.toFixed(2)} kW`, 20, 71)
       .text(`Infra Maximum: ${results.infraMaximum.toFixed(2)} kW`, 20, 79)
       .setFont('helvetica','bold')
       .text(`Total Nominal: ${results.totalNominal.toFixed(2)} kW`, 20, 93)
       .text(`Total Maximum: ${results.totalMaximum.toFixed(2)} kW`, 20, 101);

    // Add chart image
    const canvas = document.getElementById('powerChart');
    if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 20, 110, 170, 80);
    }

    // Table
    const body = [];
    results.itDevices.forEach(d => body.push([
        'IT', d.device_brand, d.model, d.type_of_ne,
        d.count, d.nominal_power_usage_watts, d.maximum_power_usage_watts,
        d.totalNominal.toFixed(2), d.totalMaximum.toFixed(2)
    ]));
    results.infraDevices.forEach(d => body.push([
        'Infra', d.device_brand, d.model, d.type_of_device,
        d.count, d.nominal_power_usage_watts, d.maximum_power_usage_watts,
        d.totalNominal.toFixed(2), d.totalMaximum.toFixed(2)
    ]));
    body.push(['TOTAL','','','', '', '', '',
        results.totalNominal.toFixed(2), results.totalMaximum.toFixed(2)
    ]);

    doc.autoTable({
        head: [[ 'Cat','Brand','Model','Type','Qty','Unit Nom','Unit Max','Tot Nom','Tot Max' ]],
        body,
        startY: 200,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [102,126,234], textColor: 255 },
        alternateRowStyles: { fillColor: [245,245,245] }
    });

    doc.save('datacenter-report.pdf');
}

// Export to Word (unchanged)
function exportToWord() {
    if (!window.calculationResults) {
        alert('Calculate first');
        return;
    }
    const r = window.calculationResults;
    let html = `<html><head><meta charset="utf-8"><title>Report</title></head><body>
        <h1>Datacenter Power Consumption Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <h2>Summary</h2>
        <p>IT Nominal: ${r.itNominal.toFixed(2)} kW</p>
        <p>IT Maximum: ${r.itMaximum.toFixed(2)} kW</p>
        <p>Infra Nominal: ${r.infraNominal.toFixed(2)} kW</p>
        <p>Infra Maximum: ${r.infraMaximum.toFixed(2)} kW</p>
        <p><strong>Total Nominal:</strong> ${r.totalNominal.toFixed(2)} kW</p>
        <p><strong>Total Maximum:</strong> ${r.totalMaximum.toFixed(2)} kW</p>
        <h2>Details</h2>
        <table border="1" cellpadding="5"><thead>
            <tr><th>Cat</th><th>Brand</th><th>Model</th><th>Type</th>
            <th>Qty</th><th>Unit Nom(W)</th><th>Unit Max(W)</th>
            <th>Total Nom(kW)</th><th>Total Max(kW)</th></tr>
        </thead><tbody>`;
    r.itDevices.forEach(d => {
        html += `<tr><td>IT</td><td>${d.device_brand}</td><td>${d.model}</td>
            <td>${d.type_of_ne}</td><td>${d.count}</td>
            <td>${d.nominal_power_usage_watts}</td>
            <td>${d.maximum_power_usage_watts}</td>
            <td>${d.totalNominal.toFixed(2)}</td>
            <td>${d.totalMaximum.toFixed(2)}</td></tr>`;
    });
    r.infraDevices.forEach(d => {
        html += `<tr><td>Infra</td><td>${d.device_brand}</td><td>${d.model}</td>
            <td>${d.type_of_device}</td><td>${d.count}</td>
            <td>${d.nominal_power_usage_watts}</td>
            <td>${d.maximum_power_usage_watts}</td>
            <td>${d.totalNominal.toFixed(2)}</td>
            <td>${d.totalMaximum.toFixed(2)}</td></tr>`;
    });
    html += `<tr><td colspan="7"><strong>Total</strong></td>
            <td>${r.totalNominal.toFixed(2)}</td>
            <td>${r.totalMaximum.toFixed(2)}</td></tr>`;
    html += `</tbody></table></body></html>`;

    const blob = htmlDocx.asBlob(html);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'datacenter-report.docx';
    link.click();
}
