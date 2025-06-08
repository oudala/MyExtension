class AvatarGenerator {
    static colors = [
        '#F87171', // red
        '#FB923C', // orange
        '#FBBF24', // amber
        '#34D399', // emerald
        '#60A5FA', // blue
        '#818CF8', // indigo
        '#A78BFA', // violet
        '#F472B6', // pink
    ];

    static getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    static getColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return this.colors[Math.abs(hash) % this.colors.length];
    }

    static generateAvatar(username, size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = this.getColorFromString(username);
        ctx.fillRect(0, 0, size, size);

        // Text
        const initials = this.getInitials(username);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${size * 0.4}px Inter, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);

        return canvas.toDataURL('image/png');
    }
} 