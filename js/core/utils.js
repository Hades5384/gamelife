const Utils = {
    getTodayISO() {
        return this.formatISODate(new Date());
    },

    parseISODate(isoStr) {
        if (!isoStr) return new Date();
        if (typeof isoStr !== 'string') {
            const d = new Date(isoStr);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        const clean = isoStr.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d, 0, 0, 0, 0);
        }
        const d = new Date(isoStr);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    formatISODate(date) {
        const d = date || new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    diffDays(date1, date2) {
        if (!date1 || !date2) return 0;
        const d1 = this.parseISODate(date1);
        const d2 = this.parseISODate(date2);
        return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    },

    addDays(isoStr, numDays) {
        const d = this.parseISODate(isoStr);
        d.setDate(d.getDate() + numDays);
        return this.formatISODate(d);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    hash(string) {
        let hash = 0;
        if (string.length === 0) return hash;
        for (let i = 0; i < string.length; i++) {
            let char = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
};
