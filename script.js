// Helper: Parse CSV to array of objects
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

// Helper: Download CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download template CSVs
document.getElementById('downloadInfraTemplate').onclick = function() {
    const csv = [
        'device_brand,model,type_of_device,maximum_power_usage_watts,nominal_power_usage_watts,weight_kg,count',
        'Schneider Electric,InRow RP DX,Precision Cooling,12000,8500,220,8'
    ].join('\n');
    downloadCSV(csv, 'infrastructure-devices-template.csv');
};

document.getElementById('downloadITTemplate').onclick = function() {
    const csv = [
        'device_brand,model,type_of_ne,maximum_power_usage_watts,nominal_power_usage_watts,count',
        'Cisco,ASR-9010,Router,4500,3800,2'
    ].join('\n');
    downloadCSV(csv, 'IT-devices-template.csv');
};

// Main
let infraData = [], itData = [];

document.getElementById('processBtn').onclick = async function() {
    const infraFile = document.getElementById('infraFile').files[0];
    const itFile = document.getElementById('itFile').files[0];
    const validationMsg = document.getElementById('validationMsg');
    validationMsg.textContent = '';
    document.getElementById('summary').innerHTML = '';
    document.getElementById('exportBtn').style.display = 'none';
    if (!infraFile || !itFile) {
        validationMsg.textContent = 'Please upload both CSV files.';
        return;
    }
    // Read files
    const infraText = await infraFile.text();
    const itText = await itFile.text();
    infraData = parseCSV(infraText);
    itData = parseCSV(itText);

    // Validate columns
    const infraCols = ['device_brand','model','type_of_device','maximum_power_usage_watts','nominal_power_usage_watts','weight_kg','count'];
    const itCols = ['device_brand','model','type_of_ne','maximum_power_usage_watts','nominal_power_usage_watts','count'];
    const infraHeaders = Object.keys(infraData[0] || {});
    const itHeaders = Object.keys(itData[0] || {});
    if (infraCols.some((c,i)=>c!==infraHeaders[i]) || itCols.some((c,i)=>c!==itHeaders[i])) {
        validationMsg.textContent = 'CSV columns do not match the required templates.';
        return;
    }

    // Summarize
    let totalDevices = 0, totalPower = 0, totalWeight = 0;
    let brandPower = {};
    infraData.forEach(d => {
        let count = Number(d.count)||0;
        let power = Number(d.nominal_power_usage_watts)||0;
        let weight = Number(d.weight_kg)||0;
        totalDevices += count;
        totalPower += power * count;
        totalWeight += weight * count;
        brandPower[d.device_brand] = (brandPower[d.device_brand]||0) + power * count;
    });
    itData.forEach(d => {
        let count = Number(d.count)||0;
        let power = Number(d.nominal_power_usage_watts)||0;
        totalDevices += count;
        totalPower += power * count;
        brandPower[d.device_brand] = (brandPower[d.device_brand]||0) + power * count;
    });

    // Show summary
    let summaryHTML = `
        <h2>Summary</h2>
        <table>
            <tr><th>Total Devices</th><td>${totalDevices}</td></tr>
            <tr><th>Total Power (Nominal, W)</th><td>${totalPower.toLocaleString()}</td></tr>
            <tr><th>Total Weight (kg)</th><td>${totalWeight.toLocaleString()}</td></tr>
        </table>
    `;
    document.getElementById('summary').innerHTML = summaryHTML;

    // Chart
    const ctx = document.getElementById('powerChart').getContext('2d');
    if (window.powerChart) window.powerChart.destroy();
    window.powerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(brandPower),
            datasets: [{
                label: 'Total Power by Brand (W)',
                data: Object.values(brandPower),
                backgroundColor: [
                    '#00e6ff', '#ff0055', '#00e6ff', '#ff0055', '#00e6ff', '#ff0055'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { 
                    labels: { color: '#00e6ff', font: { size: 16 } }
                } 
            },
            scales: {
                x: { ticks: { color: '#00e6ff' }, grid: { color: '#00e6ff33' } },
                y: { ticks: { color: '#00e6ff' }, grid: { color: '#00e6ff33' } }
            }
        }
    });

    // Export
    document.getElementById('exportBtn').style.display = '';
    document.getElementById('exportBtn').onclick = function() {
        let csv = 'Metric,Value\n';
        csv += `Total Devices,${totalDevices}\n`;
        csv += `Total Power (Nominal, W),${totalPower}\n`;
        csv += `Total Weight (kg),${totalWeight}\n`;
        downloadCSV(csv, 'datacenter_summary.csv');
    };
};
