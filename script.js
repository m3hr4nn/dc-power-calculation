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
