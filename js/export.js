// Export module - handles data export
const Export = {
    // Get study-level metadata from form
    getStudyMetadata() {
        return {
            source: document.getElementById('studySource')?.value || '',
            study: document.getElementById('studyName')?.value || '',
            endpoint: document.getElementById('studyEndpoint')?.value || '',
            figure: document.getElementById('studyFigure')?.value || '',
        };
    },

    // Escape CSV field (handle commas and quotes)
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    },

    // Generate CSV content with full metadata
    generateCSV() {
        const curves = Curves.getAll();
        if (curves.length === 0) return '';

        const studyMeta = this.getStudyMetadata();
        const headers = ['Source', 'Study', 'Endpoint', 'Figure', 'Curve', 'Treatment', 'Population', 'Line', 'N', 'Time', 'Value'];
        const rows = [headers.join(',')];

        curves.forEach(curve => {
            curve.points.forEach(point => {
                const row = [
                    this.escapeCSV(studyMeta.source),
                    this.escapeCSV(studyMeta.study),
                    this.escapeCSV(studyMeta.endpoint),
                    this.escapeCSV(studyMeta.figure),
                    this.escapeCSV(curve.name),
                    this.escapeCSV(curve.treatment),
                    this.escapeCSV(curve.population),
                    this.escapeCSV(curve.line),
                    this.escapeCSV(curve.n),
                    point.x.toFixed(4),
                    point.y.toFixed(4),
                ];
                rows.push(row.join(','));
            });
        });

        return rows.join('\n');
    },

    // Download as CSV file
    downloadCSV() {
        const csv = this.generateCSV();
        if (!csv) {
            alert('No data to export. Add some points first.');
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Generate filename from study metadata
        const studyMeta = this.getStudyMetadata();
        const studyName = studyMeta.study || studyMeta.source || 'digitized';
        const safeName = studyName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const date = new Date().toISOString().split('T')[0];
        const filename = `${safeName}_curves_${date}.csv`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    },

    // Copy to clipboard
    async copyToClipboard() {
        const csv = this.generateCSV();
        if (!csv) {
            alert('No data to copy. Add some points first.');
            return;
        }

        try {
            await navigator.clipboard.writeText(csv);
            this.showCopyFeedback('Copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = csv;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showCopyFeedback('Copied to clipboard!');
        }
    },

    // Show copy feedback
    showCopyFeedback(message) {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = message;
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    },

    // Download as Excel file with embedded image
    downloadExcel() {
        const curves = Curves.getAll();
        if (curves.length === 0 || curves.every(c => c.points.length === 0)) {
            alert('No data to export. Add some points first.');
            return;
        }

        const studyMeta = this.getStudyMetadata();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // --- Data Sheet ---
        const headers = ['Source', 'Study', 'Endpoint', 'Figure', 'Curve', 'Treatment', 'Population', 'Line', 'N', 'Time', 'Value'];
        const dataRows = [headers];

        curves.forEach(curve => {
            curve.points.forEach(point => {
                dataRows.push([
                    studyMeta.source,
                    studyMeta.study,
                    studyMeta.endpoint,
                    studyMeta.figure,
                    curve.name,
                    curve.treatment,
                    curve.population,
                    curve.line,
                    curve.n,
                    parseFloat(point.x.toFixed(4)),
                    parseFloat(point.y.toFixed(4)),
                ]);
            });
        });

        const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

        // Set column widths
        dataSheet['!cols'] = [
            { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 8 },
            { wch: 8 }, { wch: 10 }, { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');

        // --- Figure Sheet with embedded image ---
        const canvas = document.getElementById('mainCanvas');
        const imageData = canvas.toDataURL('image/png').split(',')[1]; // Base64 without prefix

        // Create figure sheet with metadata header
        const figureData = [
            ['KM/CIF Curve Digitization Report'],
            [''],
            ['Source:', studyMeta.source],
            ['Study:', studyMeta.study],
            ['Endpoint:', studyMeta.endpoint],
            ['Figure:', studyMeta.figure],
            [''],
            ['Curves:', curves.length],
            ['Total Points:', curves.reduce((sum, c) => sum + c.points.length, 0)],
            ['Export Date:', new Date().toLocaleString()],
            [''],
            ['[Digitized figure image is embedded below]'],
        ];

        const figureSheet = XLSX.utils.aoa_to_sheet(figureData);
        figureSheet['!cols'] = [{ wch: 15 }, { wch: 40 }];

        // Add image to the sheet
        if (!figureSheet['!images']) figureSheet['!images'] = [];
        figureSheet['!images'].push({
            name: 'digitized_figure.png',
            data: imageData,
            type: 'png',
            position: {
                type: 'twoCellAnchor',
                from: { col: 0, row: 13 },
                to: { col: 8, row: 35 }
            }
        });

        XLSX.utils.book_append_sheet(wb, figureSheet, 'Figure');

        // Generate filename
        const studyName = studyMeta.study || studyMeta.source || 'digitized';
        const safeName = studyName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const date = new Date().toISOString().split('T')[0];
        const filename = `${safeName}_curves_${date}.xlsx`;

        // Write and download
        XLSX.writeFile(wb, filename);
    }
};
