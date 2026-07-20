import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import {
    formatDuration,
    formatWorkoutDate,
    formatPace,
    getWorkoutById,
    deleteWorkout,
    WorkoutRecord,
} from '../lib/workouts';

export default function WorkoutDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [workout, setWorkout] = useState<WorkoutRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<MapView | null>(null);

    useEffect(() => {
        async function load() {
            if (!id) return;
            setLoading(true);
            const data = await getWorkoutById(id);
            setWorkout(data);
            setLoading(false);
        }
        void load();
    }, [id]);

    const handleDelete = () => {
        Alert.alert(
            'Delete Walk',
            'Are you sure you want to permanently delete this walk?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (workout) {
                            try {
                                await deleteWorkout(workout.id);
                                router.back();
                            } catch {
                                Alert.alert('Error', 'Could not delete this walk.');
                            }
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        if (mapReady && workout && workout.coordinates.length > 0 && mapRef.current) {
            if (workout.coordinates.length === 1) {
                mapRef.current.animateToRegion(
                    {
                        latitude: workout.coordinates[0].latitude,
                        longitude: workout.coordinates[0].longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    },
                    500
                );
            } else {
                mapRef.current.fitToCoordinates(workout.coordinates, {
                    edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
                    animated: true,
                });
            }
        }
    }, [mapReady, workout]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color="#1d1d1f" />
            </View>
        );
    }

    if (!workout) {
        return (
            <View style={styles.centered}>
                <StatusBar style="dark" />
                <Text style={styles.errorText} allowFontScaling={false}>
                    Workout not found
                </Text>
                <TouchableOpacity
                    style={styles.backButtonSimple}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backButtonSimpleText} allowFontScaling={false}>
                        Go Back
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const hasCoords = workout.coordinates.length > 0;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                onMapReady={() => setMapReady(true)}
                showsUserLocation={false}
                showsMyLocationButton={false}
                zoomEnabled={true}
                scrollEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
            >
                {hasCoords && (
                    <>
                        <Polyline
                            coordinates={workout.coordinates}
                            strokeColor="#1d1d1f"
                            strokeWidth={5}
                        />
                        <Marker coordinate={workout.coordinates[0]} anchor={{ x: 0.5, y: 0.5 }}>
                            <View style={[styles.markerDot, { backgroundColor: '#34c759' }]} />
                        </Marker>
                        <Marker
                            coordinate={workout.coordinates[workout.coordinates.length - 1]}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={[styles.markerDot, { backgroundColor: '#ff3b30' }]} />
                        </Marker>
                    </>
                )}
            </MapView>

            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.backText} allowFontScaling={false}>
                                ← Back
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.deleteText} allowFontScaling={false}>
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} allowFontScaling={false}>
                            Walk Summary
                        </Text>
                        <Text style={styles.subtitle} allowFontScaling={false}>
                            {formatWorkoutDate(workout.finishedAt)}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.bottomSheet}>
                <View style={styles.dragHandle} />

                <View style={styles.metrics}>
                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue} allowFontScaling={false}>
                            {workout.distanceKm.toFixed(2)}
                        </Text>
                        <Text style={styles.metricLabel} allowFontScaling={false}>
                            Distance
                        </Text>
                        <Text style={styles.metricUnit} allowFontScaling={false}>
                            (km)
                        </Text>
                    </View>

                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue} allowFontScaling={false}>
                            {formatDuration(workout.durationSeconds)}
                        </Text>
                        <Text style={styles.metricLabel} allowFontScaling={false}>
                            Duration
                        </Text>
                        <Text style={styles.metricUnit} allowFontScaling={false}>
                            (min)
                        </Text>
                    </View>

                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue} allowFontScaling={false}>
                            {formatPace(workout.distanceKm, workout.durationSeconds).split(' ')[0]}
                        </Text>
                        <Text style={styles.metricLabel} allowFontScaling={false}>
                            Avg Pace
                        </Text>
                        <Text style={styles.metricUnit} allowFontScaling={false}>
                            (/km)
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f7',
    },
    map: {
        ...StyleSheet.absoluteFill,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    errorText: {
        color: '#1d1d1f',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    backButtonSimple: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#1d1d1f',
        borderRadius: 8,
    },
    backButtonSimpleText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    markerDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 8,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        paddingVertical: 8,
        paddingRight: 16,
    },
    backText: {
        color: '#007aff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        paddingVertical: 8,
        paddingLeft: 16,
    },
    deleteText: {
        color: '#ff3b30',
        fontSize: 16,
        fontWeight: '600',
    },
    titleContainer: {
        marginTop: 4,
    },
    title: {
        color: '#1d1d1f',
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        color: '#86868b',
        fontSize: 14,
        marginTop: 2,
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -4 },
        elevation: 5,
    },
    dragHandle: {
        alignSelf: 'center',
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#e5e5ea',
        marginBottom: 16,
    },
    metrics: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
    },
    metricBlock: {
        alignItems: 'center',
        flex: 1,
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
        fontWeight: '500',
    },
    metricUnit: {
        color: '#86868b',
        fontSize: 10,
    },
});
