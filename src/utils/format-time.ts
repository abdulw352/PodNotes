/**
 * Formats a time in seconds to a string in the format MM:SS or HH:MM:SS
 * @param seconds The time in seconds
 * @returns A formatted time string
 */
export function formatTime(seconds: number): string {
    // Handle invalid or extreme inputs
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    
    // Cap at reasonable maximum (999 hours)
    const MAX_REASONABLE_TIME = 999 * 3600; // 999 hours in seconds
    if (seconds > MAX_REASONABLE_TIME) {
        seconds = MAX_REASONABLE_TIME;
    }
    
    // Ensure seconds is non-negative
    seconds = Math.max(0, seconds);
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
} 