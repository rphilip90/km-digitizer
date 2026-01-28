// Report generation module
const Report = {
    // Get metadata from form fields
    getMetadata() {
        return {
            source: document.getElementById('studySource')?.value || '',
            endpoint: document.getElementById('studyEndpoint')?.value || '',
            population: document.getElementById('studyPopulation')?.value || '',
            notes: document.getElementById('studyNotes')?.value || '',
            exportDate: new Date().toLocaleString(),
            calibration: {
                xMin: Calibration.values.xMin,
                xMax: Calibration.values.xMax,
                yMin: Calibration.values.yMin,
                yMax: Calibration.values.yMax
            }
        };
    },

    // Capture canvas as image data URL
    captureCanvas() {
        const canvas = document.getElementById('mainCanvas');
        return canvas.toDataURL('image/png');
    },

    // Generate data table HTML
    generateDataTable() {
        const curves = Curves.getAll();
        if (curves.length === 0) return '<p>No data points captured.</p>';

        let html = '';

        curves.forEach(curve => {
            html += `<h3 style="color: ${curve.color}; margin-top: 20px;">${curve.name}</h3>`;
            html += `<table class="data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>`;

            curve.points.forEach(point => {
                html += `<tr>
                    <td>${point.x.toFixed(4)}</td>
                    <td>${point.y.toFixed(4)}</td>
                </tr>`;
            });

            html += '</tbody></table>';
            html += `<p><em>${curve.points.length} points</em></p>`;
        });

        return html;
    },

    // Generate full report HTML
    generateReportHTML() {
        const metadata = this.getMetadata();
        const canvasImage = this.captureCanvas();
        const dataTable = this.generateDataTable();
        const curves = Curves.getAll();

        const totalPoints = curves.reduce((sum, c) => sum + c.points.length, 0);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curve Digitization Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2196F3;
            font-size: 1.8rem;
        }
        .header p {
            color: #666;
            font-size: 0.9rem;
        }
        .metadata {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .metadata-item {
            padding: 5px 0;
        }
        .metadata-item label {
            font-weight: 600;
            color: #555;
            display: block;
            font-size: 0.8rem;
            text-transform: uppercase;
        }
        .metadata-item span {
            font-size: 1rem;
        }
        .figure-section {
            margin: 20px 0;
            page-break-inside: avoid;
        }
        .figure-section h2 {
            font-size: 1.2rem;
            margin-bottom: 10px;
            color: #333;
        }
        .figure-container {
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
        }
        .figure-container img {
            width: 100%;
            height: auto;
            display: block;
        }
        .data-section {
            margin: 20px 0;
        }
        .data-section h2 {
            font-size: 1.2rem;
            margin-bottom: 10px;
            color: #333;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            margin-bottom: 10px;
        }
        .data-table th, .data-table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        .data-table th {
            background: #f0f0f0;
            font-weight: 600;
        }
        .data-table tr:nth-child(even) {
            background: #fafafa;
        }
        .summary {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .summary h3 {
            margin-bottom: 10px;
            color: #1976D2;
        }
        .calibration-info {
            font-size: 0.85rem;
            color: #666;
            margin-top: 10px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 0.8rem;
            color: #888;
            text-align: center;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Curve Digitization Report</h1>
        <p>Generated: ${metadata.exportDate}</p>
    </div>

    <div class="metadata">
        <div class="metadata-grid">
            <div class="metadata-item">
                <label>Source / Author</label>
                <span>${metadata.source || 'Not specified'}</span>
            </div>
            <div class="metadata-item">
                <label>Endpoint</label>
                <span>${metadata.endpoint || 'Not specified'}</span>
            </div>
            <div class="metadata-item">
                <label>Population</label>
                <span>${metadata.population || 'Not specified'}</span>
            </div>
            <div class="metadata-item">
                <label>Notes</label>
                <span>${metadata.notes || 'None'}</span>
            </div>
        </div>
    </div>

    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Curves digitized:</strong> ${curves.length}</p>
        <p><strong>Total data points:</strong> ${totalPoints}</p>
        <div class="calibration-info">
            <strong>Axis calibration:</strong>
            X: ${metadata.calibration.xMin} to ${metadata.calibration.xMax} |
            Y: ${metadata.calibration.yMin} to ${metadata.calibration.yMax}
        </div>
    </div>

    <div class="figure-section">
        <h2>Digitized Figure</h2>
        <div class="figure-container">
            <img src="${canvasImage}" alt="Digitized curve">
        </div>
    </div>

    <div class="data-section">
        <h2>Extracted Data</h2>
        ${dataTable}
    </div>

    <div class="footer">
        <p>Generated using KM/CIF Curve Digitizer</p>
        <p>https://rphilip90.github.io/km-digitizer/</p>
    </div>

    <script>
        // Auto-print option
        // window.onload = () => window.print();
    </script>
</body>
</html>`;
    },

    // Download report as HTML file
    downloadReport() {
        const curves = Curves.getAll();
        if (curves.length === 0 || curves.every(c => c.points.length === 0)) {
            alert('No data to export. Please digitize some curves first.');
            return;
        }

        const html = this.generateReportHTML();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Create filename from metadata
        const source = document.getElementById('studySource')?.value || 'digitization';
        const safeName = source.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const date = new Date().toISOString().split('T')[0];
        const filename = `${safeName}_report_${date}.html`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }
};
