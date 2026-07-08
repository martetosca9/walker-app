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
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>History</Text>
                <Text style={styles.subtitle}>Saved walks</Text>
            </SafeAreaView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#111" />
                </View>
            ) : workouts.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyTitle}>No walks yet</Text>
                    <Text style={styles.emptyText}>Stop a workout on the home screen to save it here.</Text>
                </View>
            ) : (
                <FlatList
                    data={workouts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardDate}>{formatWorkoutDate(item.finishedAt)}</Text>
                            <View style={styles.cardMetrics}>
                                <View>
                                    <Text style={styles.metricValue}>{item.distanceKm.toFixed(1)}</Text>
                                    <Text style={styles.metricLabel}>km</Text>
                                </View>
                                <View>
                                    <Text style={styles.metricValue}>{formatDuration(item.durationSeconds)}</Text>
                                    <Text style={styles.metricLabel}>duration</Text>
                                </View>
                            </View>
                        </View>
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
        color: '#111',
        fontSize: 18,
        fontWeight: '600',
    },
    title: {
        color: '#050505',
        fontSize: 32,
        fontWeight: '800',
    },
    subtitle: {
        color: '#6f6f6f',
        fontSize: 20,
        marginTop: 4,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        color: '#111',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        color: '#6f6f6f',
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 12,
    },
    card: {
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    cardDate: {
        color: '#6f6f6f',
        fontSize: 16,
        marginBottom: 12,
    },
    cardMetrics: {
        flexDirection: 'row',
        gap: 32,
    },
    metricValue: {
        color: '#000',
        fontSize: 36,
        fontWeight: '800',
    },
    metricLabel: {
        color: '#111',
        fontSize: 16,
        marginTop: 2,
    },
});
