const socket = io();

const cpuChartCtx = document.getElementById('cpu-chart').getContext('2d');
const cpuData = {
    labels: [],
    datasets: [{
        label: 'CPU Usage (%)',
        data: [],
        borderColor: '#fb7185',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(251, 113, 133, 0.1)'
    }]
};

const cpuChart = new Chart(cpuChartCtx, {
    type: 'line',
    data: cpuData,
    options: {
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#334155' } },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } },
        animation: false
    }
});

socket.on('stats', (stats) => {
    // Update Values
    document.getElementById('cpu-value').innerText = `${stats.cpu}%`;
    document.getElementById('ram-value').innerText = `${stats.memory}%`;
    document.getElementById('ram-progress').style.width = `${stats.memory}%`;

    // Update Chart
    cpuChart.data.labels.push(stats.timestamp);
    cpuChart.data.datasets[0].data.push(stats.cpu);
    
    if (cpuChart.data.labels.length > 20) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    cpuChart.update();

    // Add Log
    const logs = document.getElementById('logs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = `[${stats.timestamp}] CPU: ${stats.cpu}% | RAM: ${stats.memory}%`;
    logs.prepend(entry);
    
    if (logs.childNodes.length > 50) {
        logs.removeChild(logs.lastChild);
    }
});
