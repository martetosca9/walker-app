import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'walker-workouts';

export type Coordinate = {
    latitude: number;
    longitude: number;
};

export type WorkoutRecord = {
    id: string;
    finishedAt: string;
    distanceKm: number;
    durationSeconds: number;
    coordinates: Coordinate[];
};

export const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatWorkoutDate = (isoDate: string) => {
    const date = new Date(isoDate);

    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatPace = (distanceKm: number, durationSeconds: number) => {
    if (distanceKm <= 0) return "-'--\"";
    const totalMinutes = (durationSeconds / 60) / distanceKm;
    const paceMinutes = Math.floor(totalMinutes);
    const paceSeconds = Math.round((totalMinutes - paceMinutes) * 60);
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;
};

export async function getWorkouts(): Promise<WorkoutRecord[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function getWorkoutById(id: string): Promise<WorkoutRecord | null> {
    const workouts = await getWorkouts();
    return workouts.find((w) => w.id === id) || null;
}

export async function saveWorkout(
    workout: Omit<WorkoutRecord, 'id'>
): Promise<WorkoutRecord> {
    const record: WorkoutRecord = {
        ...workout,
        id: `${Date.now()}`,
    };

    const existing = await getWorkouts();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));

    return record;
}

export async function deleteWorkout(id: string): Promise<void> {
    const existing = await getWorkouts();
    const filtered = existing.filter((w) => w.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

