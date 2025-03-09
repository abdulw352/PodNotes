/**
 * Formats a time in seconds to a string in the format MM:SS or HH:MM:SS
 * @param seconds The time in seconds
 * @returns A formatted time string
 */
export function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
} 