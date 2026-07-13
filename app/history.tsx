import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatDuration, formatWorkoutDate, getWorkouts, WorkoutRecord } from '../lib/workouts';

export default function History() {
    const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadWorkouts = useCallback(async () => {
        setLoading(true);
        const saved = await getWorkouts();
        setWorkouts(saved);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadWorkouts();
        }, [loadWorkouts])
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <SafeAreaView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                    <Text style={styles.backText} allowFontScaling={false}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title} allowFontScaling={false}>History</Text>
                <Text style={styles.subtitle} allowFontScaling={false}>Saved walks</Text>
            </SafeAreaView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#1d1d1f" />
                </View>
            ) : workouts.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyTitle} allowFontScaling={false}>No walks yet</Text>
                    <Text style={styles.emptyText} allowFontScaling={false}>Stop a workout on the home screen to save it here.</Text>
                </View>
            ) : (
                <FlatList
                    data={workouts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/workout-detail', params: { id: item.id } })}
                        >
                            <Text style={styles.cardDate} allowFontScaling={false}>{formatWorkoutDate(item.finishedAt)}</Text>
                            <View style={styles.cardMetrics}>
                                <View>
                                    <Text style={styles.metricValue} allowFontScaling={false}>{item.distanceKm.toFixed(1)}</Text>
                                    <Text style={styles.metricLabel} allowFontScaling={false}>km</Text>
                                </View>
                                <View>
                                    <Text style={styles.metricValue} allowFontScaling={false}>{formatDuration(item.durationSeconds)}</Text>
                                    <Text style={styles.metricLabel} allowFontScaling={false}>duration</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        marginBottom: 8,
    },
    backText: {
        color: '#007aff',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        color: '#1d1d1f',
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        color: '#86868b',
        fontSize: 14,
        marginTop: 4,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        color: '#1d1d1f',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        color: '#86868b',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 12,
    },
    card: {
        borderRadius: 12,
        backgroundColor: '#f5f5f7',
        padding: 16,
    },
    cardDate: {
        color: '#86868b',
        fontSize: 14,
        marginBottom: 12,
    },
    cardMetrics: {
        flexDirection: 'row',
        gap: 32,
    },
    metricValue: {
        color: '#1d1d1f',
        fontSize: 28,
        fontWeight: '800',
    },
    metricLabel: {
        color: '#86868b',
        fontSize: 12,
        marginTop: 2,
    },
});
