// Global variables to store device data
let itDevicesData = [];
let infraDevicesData = [];
let selectedDevices = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupFileUploadHandlers();
});

function setupFileUploadHandlers() {
    document.getElementById('itDevicesFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'it');
    });
    
    document.getElementById('infraDevicesFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'infra');
    });
}

function handleFileUpload(event, type) {
    const file = event.target.files[0];
    const statusElement = document.getElementById(`${type}Status`);
    
    if (!file) return;
    
    if (file.type !== 'text/csv') {
        showStatus(statusElement, 'Please select a CSV file', 'error');
        return;
    }
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                showStatus(statusElement, `Error parsing CSV: ${results.errors[0].message}`, 'error');
                return;
            }
            
            const data = results.data;
            if (validateCSVData(data, type)) {
                if (type === 'it') {
                    itDevicesData = data;
                } else {
                    infraDevicesData = data;
                }
                
                showStatus(statusElement, `✅ ${data.length} devices loaded successfully`, 'success');
                updateDevicesList(type, data);
                
                // Show calculator section if both files are loaded
                if (itDevicesData.length > 0 && infraDevicesData.length > 0) {
                    document.getElementById('calculatorSection').style.display = 'block';
                }
            } else {
                showStatus(statusElement, 'Invalid CSV format. Please check the template.', 'error');
            }
        },
        error: function(error) {
            showStatus(statusElement, `Error reading file: ${error.message}`, 'error');
        }
    });
}

function validateCSVData(data, type) {
    if (!data || data.length === 0) return false;
    
    const requiredColumns = type === 'it' 
        ? ['device_brand', 'model', 'type_of_ne', 'maximum_power_usage_watts', 'nominal_power_usage_watts', 'count']
        : ['device_brand', 'model', 'type_of_device', 'maximum_power_usage_watts', 'nominal_power_usage_watts', 'weight_kg', 'count'];
    
    const firstRow = data[0];
    return requiredColumns.every(col => col in firstRow);
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type}`;
}

function updateDevicesList(type, data) {
    const listElement = document.getElementById(`${type}DevicesList`);
    listElement.innerHTML = '';
    
    data.forEach((device, index) => {
        const deviceElement = createDeviceElement(device, type, index);
        listElement.appendChild(deviceElement);
    });
}

function createDeviceElement(device, type, index) {
    const deviceDiv = document.createElement('div');
    deviceDiv.className = 'device-item';
    
    const typeField = type === 'it' ? 'type_of_ne' : 'type_of_device';
    
    deviceDiv.innerHTML = `
        <div class="device-header">
            <div class="device-name">${device.device_brand} ${device.model}</div>
            <div class="device-type">${device[typeField]}</div>
        </div>
        <div class="device-details">
            Max: ${device.maximum_power_usage_watts}W | Nominal: ${device.nominal_power_usage_watts}W
            ${type === 'infra' ? ` | Weight: ${device.weight_kg}kg` : ''}
        </div>
        <div class="device-count">
            <label>Quantity:</label>
            <input type="number" 
                   id="${type}_${index}" 
                   value="${device.count || 0}" 
                   min="0" 
                   onchange="updateDeviceCount('${type}', ${index}, this.value)">
        </div>
    `;
    
    return deviceDiv;
}

function updateDeviceCount(type, index, count) {
    const data = type === 'it' ? itDevicesData : infraDevicesData;
    data[index].count = parseInt(count) || 0;
}

function calculatePower() {
    const results = {
        itDevices: [],
        infraDevices: [],
        itNominal: 0,
        itMaximum: 0,
        infraNominal: 0,
        infraMaximum: 0,
        totalNominal: 0,
        totalMaximum: 0
    };
    
    // Calculate IT devices power
    itDevicesData.forEach(device => {
        if (device.count > 0) {
            const nominalPower = (device.nominal_power_usage_watts * device.count) / 1000; // Convert to kW
            const maximumPower = (device.maximum_power_usage_watts * device.count) / 1000; // Convert to kW
            
            results.itDevices.push({
                ...device,
                totalNominal: nominalPower,
                totalMaximum: maximumPower
            });
            
            results.itNominal += nominalPower;
            results.itMaximum += maximumPower;
        }
    });
    
    // Calculate Infrastructure devices power
    infraDevicesData.forEach(device => {
        if (device.count > 0) {
            const nominalPower = (device.nominal_power_usage_watts * device.count) / 1000; // Convert to kW
            const maximumPower = (device.maximum_power_usage_watts * device.count) / 1000; // Convert to kW
            
            results.infraDevices.push({
                ...device,
                totalNominal: nominalPower,
                totalMaximum: maximumPower
            });
            
            results.infraNominal += nominalPower;
            results.infraMaximum += maximumPower;
        }
    });
    
    // Calculate totals
    results.totalNominal = results.itNominal + results.infraNominal;
    results.totalMaximum = results.itMaximum + results.infraMaximum;
    
    // Store results globally for export
    window.calculationResults = results;
    
    // Display results
    displayResults(results);
}

function displayResults(results) {
    // Update summary cards
    document.getElementById('itNominal').textContent = `${results.itNominal.toFixed(2)} kW`;
    document.getElementById('itMaximum').textContent = `${results.itMaximum.toFixed(2)} kW`;
    document.getElementById('infraNominal').textContent = `${results.infraNominal.toFixed(2)} kW`;
    document.getElementById('infraMaximum').textContent = `${results.infraMaximum.toFixed(2)} kW`;
    document.getElementById('totalNominal').textContent = `${results.totalNominal.toFixed(2)} kW`;
    document.getElementById('totalMaximum').textContent = `${results.totalMaximum.toFixed(2)} kW`;
    
    // Create detailed table
    createDetailedTable(results);
    
    // Show results container
    document.getElementById('resultsContainer').style.display = 'block';
}

function createDetailedTable(results) {
    const tableContainer = document.getElementById('detailedTable');
    
    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Unit Nominal (W)</th>
                    <th>Unit Maximum (W)</th>
                    <th>Total Nominal (kW)</th>
                    <th>Total Maximum (kW)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add IT devices
    results.itDevices.forEach(device => {
        tableHTML += `
            <tr class="category-it">
                <td>IT Equipment</td>
                <td>${device.device_brand}</td>
                <td>${device.model}</td>
                <td>${device.type_of_ne}</td>
                <td>${device.count}</td>
                <td>${device.nominal_power_usage_watts}</td>
                <td>${device.maximum_power_usage_watts}</td>
                <td>${device.totalNominal.toFixed(2)}</td>
                <td>${device.totalMaximum.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add Infrastructure devices
    results.infraDevices.forEach(device => {
        tableHTML += `
            <tr class="category-infra">
                <td>Infrastructure</td>
                <td>${device.device_brand}</td>
                <td>${device.model}</td>
                <td>${device.type_of_device}</td>
                <td>${device.count}</td>
                <td>${device.nominal_power_usage_watts}</td>
                <td>${device.maximum_power_usage_watts}</td>
                <td>${device.totalNominal.toFixed(2)}</td>
                <td>${device.totalMaximum.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add total row
    tableHTML += `
            <tr class="total-row">
                <td colspan="7"><strong>TOTAL POWER CONSUMPTION</strong></td>
                <td><strong>${results.totalNominal.toFixed(2)} kW</strong></td>
                <td><strong>${results.totalMaximum.toFixed(2)} kW</strong></td>
            </tr>
        </tbody>
    </table>
    `;
    
    tableContainer.innerHTML = tableHTML;
}

function downloadITTemplate() {
    const csvContent = `device_brand,model,type_of_ne,maximum_power_usage_watts,nominal_power_usage_watts,count
Cisco,ASR-9010,Router,4500,3800,2
Cisco,Catalyst-9500,Switch,715,450,8
Cisco,ASA-5555-X,Firewall,210,150,4
Juniper,MX960,Router,2400,1800,3
HPE,Aruba-8360,Switch,465,320,6
Dell,PowerEdge-R750,Server,1400,980,18`;
    
    downloadCSV(csvContent, 'IT-devices-template.csv');
}

function downloadInfraTemplate() {
    const csvContent = `device_brand,model,type_of_device,maximum_power_usage_watts,nominal_power_usage_watts,weight_kg,count
Schneider Electric,InRow RP DX,Precision Cooling,12000,8500,220,8
APC,NetShelter SX 42U,Rack Enclosure,0,0,68,24
Liebert,DS 30kW,Precision Cooling,2200,1800,180,6
Schneider Electric,Galaxy VM,UPS 200kVA,4500,3200,680,2
3M,Novec 1230,Fire Suppression Agent,0,0,1400,2
Schneider Electric,NetBotz 755,Environmental Monitor,35,25,2.5,15`;
    
    downloadCSV(csvContent, 'infrastructure-devices-template.csv');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToPDF() {
    if (!window.calculationResults) {
        alert('Please calculate power consumption first.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Datacenter Power Consumption Report', 20, 20);
    
    // Add generation date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add summary section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Power Consumption Summary', 20, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const results = window.calculationResults;
    
    doc.text(`IT Equipment - Nominal: ${results.itNominal.toFixed(2)} kW`, 20, 65);
    doc.text(`IT Equipment - Maximum: ${results.itMaximum.toFixed(2)} kW`, 20, 75);
    doc.text(`Infrastructure - Nominal: ${results.infraNominal.toFixed(2)} kW`, 20, 85);
    doc.text(`Infrastructure - Maximum: ${results.infraMaximum.toFixed(2)} kW`, 20, 95);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Nominal Power: ${results.totalNominal.toFixed(2)} kW`, 20, 110);
    doc.text(`Total Maximum Power: ${results.totalMaximum.toFixed(2)} kW`, 20, 120);
    
    // Prepare table data
    let tableData = [];
    
    // Add IT devices
    results.itDevices.forEach(device => {
        tableData.push([
            'IT Equipment',
            device.device_brand,
            device.model,
            device.type_of_ne,
            device.count.toString(),
            device.nominal_power_usage_watts.toString(),
            device.maximum_power_usage_watts.toString(),
            device.totalNominal.toFixed(2),
            device.totalMaximum.toFixed(2)
        ]);
    });
    
    // Add Infrastructure devices
    results.infraDevices.forEach(device => {
        tableData.push([
            'Infrastructure',
            device.device_brand,
            device.model,
            device.type_of_device,
            device.count.toString(),
            device.nominal_power_usage_watts.toString(),
            device.maximum_power_usage_watts.toString(),
            device.totalNominal.toFixed(2),
            device.totalMaximum.toFixed(2)
        ]);
    });
    
    // Add total row
    tableData.push([
        'TOTAL', '', '', '', '', '', '',
        results.totalNominal.toFixed(2),
        results.totalMaximum.toFixed(2)
    ]);
    
    // Add detailed table
    doc.autoTable({
        head: [['Category', 'Brand', 'Model', 'Type', 'Qty', 'Unit Nom.(W)', 'Unit Max.(W)', 'Total Nom.(kW)', 'Total Max.(kW)']],
        body: tableData,
        startY: 140,
        styles: {
            fontSize: 8,
            cellPadding: 2
        },
        headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        didParseCell: function(data) {
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fillColor = [46, 204, 113];
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });
    
    // Save the PDF
    doc.save('datacenter-power-consumption-report.pdf');
}

function exportToWord() {
    if (!window.calculationResults) {
        alert('Please calculate power consumption first.');
        return;
    }
    
    const results = window.calculationResults;
    
    // Create HTML content for Word export
    let htmlContent = `
        <html>
        <head>
            <meta charset="utf-8">
            <title>Datacenter Power Consumption Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { color: #34495e; margin-top: 30px; }
                .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .summary-item { margin: 5px 0; }
                .total { font-weight: bold; color: #e67e22; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #3498db; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .it-row { background: #e3f2fd; }
                .infra-row { background: #fce4ec; }
                .total-row { background: #e8f5e8; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <h1>Datacenter Power Consumption Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>Executive Summary</h2>
            <div class="summary">
                <div class="summary-item">IT Equipment Nominal Power: <strong>${results.itNominal.toFixed(2)} kW</strong></div>
                <div class="summary-item">IT Equipment Maximum Power: <strong>${results.itMaximum.toFixed(2)} kW</strong></div>
                <div class="summary-item">Infrastructure Nominal Power: <strong>${results.infraNominal.toFixed(2)} kW</strong></div>
                <div class="summary-item">Infrastructure Maximum Power: <strong>${results.infraMaximum.toFixed(2)} kW</strong></div>
                <div class="summary-item total">Total Nominal Power: <strong>${results.totalNominal.toFixed(2)} kW</strong></div>
                <div class="summary-item total">Total Maximum Power: <strong>${results.totalMaximum.toFixed(2)} kW</strong></div>
            </div>
            
            <h2>Detailed Equipment Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Unit Nominal (W)</th>
                        <th>Unit Maximum (W)</th>
                        <th>Total Nominal (kW)</th>
                        <th>Total Maximum (kW)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add IT devices
    results.itDevices.forEach(device => {
        htmlContent += `
            <tr class="it-row">
                <td>IT Equipment</td>
                <td>${device.device_brand}</td>
                <td>${device.model}</td>
                <td>${device.type_of_ne}</td>
                <td>${device.count}</td>
                <td>${device.nominal_power_usage_watts}</td>
                <td>${device.maximum_power_usage_watts}</td>
                <td>${device.totalNominal.toFixed(2)}</td>
                <td>${device.totalMaximum.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add Infrastructure devices
    results.infraDevices.forEach(device => {
        htmlContent += `
            <tr class="infra-row">
                <td>Infrastructure</td>
                <td>${device.device_brand}</td>
                <td>${device.model}</td>
                <td>${device.type_of_device}</td>
                <td>${device.count}</td>
                <td>${device.nominal_power_usage_watts}</td>
                <td>${device.maximum_power_usage_watts}</td>
                <td>${device.totalNominal.toFixed(2)}</td>
                <td>${device.totalMaximum.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add total row
    htmlContent += `
            <tr class="total-row">
                <td colspan="7">TOTAL POWER CONSUMPTION</td>
                <td><strong>${results.totalNominal.toFixed(2)} kW</strong></td>
                <td><strong>${results.totalMaximum.toFixed(2)} kW</strong></td>
            </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <p>This report was generated by the Datacenter Power Consumption Calculator</p>
    </div>
    </body>
    </html>
    `;
    
    // Convert HTML to Word document
    const converted = htmlDocx.asBlob(htmlContent);
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(converted);
    link.setAttribute('href', url);
    link.setAttribute('download', 'datacenter-power-consumption-report.docx');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
