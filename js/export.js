// Export module - handles data export
const Export = {
    // Generate CSV content
    generateCSV() {
        const curves = Curves.getAll();
        if (curves.length === 0) return '';

        const rows = ['Time,Value,Curve'];

        curves.forEach(curve => {
            curve.points.forEach(point => {
                rows.push(`${point.x},${point.y},"${curve.name}"`);
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

        const link = document.createElement('a');
        link.href = url;
        link.download = 'digitized_curve_data.csv';
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
    }
};
