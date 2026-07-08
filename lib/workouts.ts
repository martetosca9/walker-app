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
