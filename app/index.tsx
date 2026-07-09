import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { formatDuration, saveWorkout } from '../lib/workouts';

type Coordinate = {
    latitude: number;
    longitude: number;
};

const FALLBACK_LOCATION: Coordinate = {
    latitude: 40.7128,
    longitude: -74.006,
};

const mapRegionFor = (coordinate: Coordinate, latitudeDelta = 0.01, longitudeDelta = 0.01) => ({
    ...coordinate,
    latitudeDelta,
    longitudeDelta,
});

const getCurrentCoordinate = async (showAlert = false) => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            if (showAlert) {
                Alert.alert('Location needed', 'Enable location permissions to start a workout.');
            }
            return null;
        }

        // Try getting last known position first (fast, doesn't hang)
        try {
            const lastKnown = await Location.getLastKnownPositionAsync({});
            if (lastKnown) {
                return {
                    latitude: lastKnown.coords.latitude,
                    longitude: lastKnown.coords.longitude,
                };
            }
        } catch {
            // Silently fail to try current position next
        }

        // Fallback to getCurrentPositionAsync but with a race timeout so it doesn't hang forever
        const positionPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3000)
        );

        const loc = await Promise.race([positionPromise, timeoutPromise]);
        if (!loc) {
            return null;
        }

        return {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        };
    } catch {
        if (showAlert) {
            Alert.alert('Location unavailable', 'Try again when your GPS signal is ready.');
        }
        return null;
    }
};

const distanceBetween = (start: Coordinate, end: Coordinate) => {
    const earthRadiusKm = 6371;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(end.latitude - start.latitude);
    const longitudeDelta = toRadians(end.longitude - start.longitude);
    const startLatitude = toRadians(start.latitude);
    const endLatitude = toRadians(end.latitude);

    const a =
        Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
        Math.cos(startLatitude) *
            Math.cos(endLatitude) *
            Math.sin(longitudeDelta / 2) *
            Math.sin(longitudeDelta / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateDistance = (coords: Coordinate[]) =>
    coords.reduce((total, coord, index) => {
        if (index === 0) return total;
        return total + distanceBetween(coords[index - 1], coord);
    }, 0);

function MenuIcon() {
    return (
        <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
        </View>
    );
}

function BellIcon() {
    return (
        <View style={styles.bellIcon}>
            <View style={styles.bellDome} />
            <View style={styles.bellBase} />
            <View style={styles.bellClapper} />
        </View>
    );
}

function GearIcon() {
    return (
        <View style={styles.gearIcon}>
            {Array.from({ length: 8 }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.gearTooth,
                        { transform: [{ rotate: `${index * 45}deg` }, { translateY: -9 }] },
                    ]}
                />
            ))}
            <View style={styles.gearOuter}>
                <View style={styles.gearInner} />
            </View>
        </View>
    );
}

function GpsIcon() {
    return (
        <View style={styles.gpsIcon}>
            <View style={styles.signalBars}>
                <View style={[styles.signalBar, { height: 6 }]} />
                <View style={[styles.signalBar, { height: 9 }]} />
                <View style={[styles.signalBar, { height: 12 }]} />
                <View style={[styles.signalBar, { height: 15 }]} />
            </View>
            <View style={styles.signalSlash} />
        </View>
    );
}

function LocationArrowIcon() {
    return (
        <View style={styles.locationArrow}>
            <View style={styles.locationArrowWing} />
        </View>
    );
}

function BottomNavIcon({ active = false }: { active?: boolean }) {
    return (
        <View style={[styles.navIcon, active && styles.navIconActive]}>
            <View style={[styles.navIconLine, active && styles.navIconLineActive]} />
            <View style={[styles.navIconLine, active && styles.navIconLineActive]} />
        </View>
    );
}

export default function Home() {
    const [coords, setCoords] = useState<Coordinate[]>([]);
    const [tracking, setTracking] = useState(false);
    const [location, setLocation] = useState<Coordinate | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<MapView | null>(null);
    const watchRef = useRef<Location.LocationSubscription | null>(null);
    const hasCenteredOnUserRef = useRef(false);

    const centerMapOn = useCallback((coordinate: Coordinate) => {
        mapRef.current?.animateToRegion(mapRegionFor(coordinate), 500);
    }, []);

    useEffect(() => {
        let mounted = true;

        (async () => {
            const currentLocation = await getCurrentCoordinate();
            if (!mounted || !currentLocation) return;

            setLocation(currentLocation);
        })();

        return () => {
            mounted = false;
            watchRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (!tracking) return;

        const timer = setInterval(() => {
            setElapsedSeconds((current) => current + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [tracking]);

    const distance = useMemo(() => calculateDistance(coords), [coords]);

    useEffect(() => {
        if (!mapReady || !location || hasCenteredOnUserRef.current) return;

        hasCenteredOnUserRef.current = true;
        centerMapOn(location);
    }, [centerMapOn, location, mapReady]);

    const stopTracking = useCallback(() => {
        watchRef.current?.remove();
        watchRef.current = null;
        setTracking(false);
    }, []);

    const handleStopWorkout = async () => {
        const workoutCoords = coords;
        const workoutDuration = elapsedSeconds;
        const workoutDistance = distance;

        stopTracking();

        if (workoutDuration < 1 || workoutCoords.length === 0) return;

        try {
            await saveWorkout({
                finishedAt: new Date().toISOString(),
                distanceKm: workoutDistance,
                durationSeconds: workoutDuration,
                coordinates: workoutCoords,
            });
        } catch {
            Alert.alert('Could not save workout', 'Your walk was stopped but not saved.');
        }
    };

    const startTracking = async () => {
        if (tracking) return;

        const currentLocation = (await getCurrentCoordinate(true)) ?? location;
        if (!currentLocation) return;

        watchRef.current?.remove();
        watchRef.current = null;

        setLocation(currentLocation);
        setCoords([currentLocation]);
        setElapsedSeconds(0);

        try {
            watchRef.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 5 },
                (loc) => {
                    const nextCoord = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    };

                    setCoords((current) => [...current, nextCoord]);
                    setLocation(nextCoord);
                }
            );
            setTracking(true);
        } catch {
            watchRef.current?.remove();
            watchRef.current = null;
            setCoords([]);
            setElapsedSeconds(0);
            setTracking(false);
            Alert.alert('Workout not started', 'Location tracking could not be started.');
        }
    };

    const centerOnCurrentLocation = async () => {
        const currentLocation = (await getCurrentCoordinate(true)) ?? location;
        if (!currentLocation) return;

        setLocation(currentLocation);
        centerMapOn(currentLocation);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={mapRegionFor(FALLBACK_LOCATION, 45, 45)}
                onMapReady={() => setMapReady(true)}
                showsUserLocation={Boolean(location)}
                showsMyLocationButton={false}
            >
                {coords.length > 1 && (
                    <Polyline coordinates={coords} strokeColor="#111" strokeWidth={5} />
                )}
            </MapView>

            <SafeAreaView style={styles.header}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                        <MenuIcon />
                    </TouchableOpacity>

                    <View style={styles.topActions}>
                        <TouchableOpacity style={styles.roundIconButton} activeOpacity={0.7}>
                            <Text style={styles.walkBadge} allowFontScaling={false}>W</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                            <BellIcon />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.titleRow}>
                    <View>
                        <Text style={styles.title} allowFontScaling={false}>Walk</Text>
                        <Text style={styles.subtitle} allowFontScaling={false}>Choose your activity</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                        <GearIcon />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View style={styles.mapControls}>
                <TouchableOpacity style={styles.squareMapButton} activeOpacity={0.75}>
                    <GpsIcon />
                    <Text style={styles.gpsText} allowFontScaling={false}>GPS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.routeButton} activeOpacity={0.8}>
                    <Text style={styles.routeText} allowFontScaling={false}>Load Route</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.squareMapButton}
                    activeOpacity={0.75}
                    onPress={centerOnCurrentLocation}
                >
                    <LocationArrowIcon />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomSheet}>
                <View style={styles.dragHandle} />

                <View style={styles.metrics}>
                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue} allowFontScaling={false}>{distance.toFixed(1)}</Text>
                        <Text style={styles.metricLabel} allowFontScaling={false}>Distance</Text>
                        <Text style={styles.metricUnit} allowFontScaling={false}>(km)</Text>
                    </View>

                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue} allowFontScaling={false}>{formatDuration(elapsedSeconds)}</Text>
                        <Text style={styles.metricLabel} allowFontScaling={false}>Duration</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.startButton, tracking && styles.stopButton]}
                    activeOpacity={0.85}
                    onPress={tracking ? handleStopWorkout : startTracking}
                >
                    <Text style={styles.startButtonText} allowFontScaling={false}>
                        {tracking ? 'STOP WORKOUT' : 'START WORKOUT'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.bottomNav}>
                    <BottomNavIcon active />
                    <TouchableOpacity
                        style={styles.navButton}
                        activeOpacity={0.7}
                        onPress={() => router.push('/history')}
                    >
                        <BottomNavIcon />
                    </TouchableOpacity>
                    <BottomNavIcon />
                    <BottomNavIcon />
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
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    topBar: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    title: {
        color: '#1d1d1f',
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        color: '#86868b',
        fontSize: 14,
        lineHeight: 18,
    },
    iconButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roundIconButton: {
        width: 32,
        height: 32,
        borderWidth: 2,
        borderColor: '#1d1d1f',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walkBadge: {
        color: '#1d1d1f',
        fontSize: 14,
        fontWeight: '800',
    },
    menuIcon: {
        width: 20,
        gap: 4,
    },
    menuLine: {
        height: 2,
        backgroundColor: '#1d1d1f',
        borderRadius: 1,
    },
    bellIcon: {
        width: 18,
        height: 20,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bellDome: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderColor: '#1d1d1f',
        borderBottomWidth: 0,
        borderTopLeftRadius: 7,
        borderTopRightRadius: 7,
    },
    bellBase: {
        width: 18,
        height: 5,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: '#1d1d1f',
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    bellClapper: {
        width: 4,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#1d1d1f',
        marginTop: -1,
    },
    gearIcon: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gearTooth: {
        position: 'absolute',
        width: 4,
        height: 6,
        borderRadius: 1,
        backgroundColor: '#1d1d1f',
    },
    gearOuter: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1d1d1f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gearInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    mapControls: {
        position: 'absolute',
        bottom: 235,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    squareMapButton: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    gpsIcon: {
        width: 24,
        height: 18,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    signalBars: {
        height: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
    },
    signalBar: {
        width: 2.5,
        backgroundColor: '#86868b',
    },
    signalSlash: {
        position: 'absolute',
        left: 2,
        top: 8,
        width: 20,
        height: 2,
        backgroundColor: '#86868b',
        transform: [{ rotate: '-28deg' }],
    },
    gpsText: {
        color: '#1d1d1f',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    routeButton: {
        height: 48,
        flex: 1,
        marginHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    routeText: {
        color: '#1d1d1f',
        fontSize: 14,
        fontWeight: '700',
    },
    locationArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 20,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#1d1d1f',
        transform: [{ rotate: '45deg' }],
    },
    locationArrowWing: {
        position: 'absolute',
        left: -4,
        top: 6,
        width: 0,
        height: 0,
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
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
        paddingBottom: 24,
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
        alignItems: 'center',
        marginBottom: 16,
    },
    metricBlock: {
        alignItems: 'center',
        flex: 1,
    },
    metricValue: {
        color: '#1d1d1f',
        fontSize: 36,
        fontWeight: '800',
    },
    metricLabel: {
        color: '#86868b',
        fontSize: 12,
        marginTop: 2,
    },
    metricUnit: {
        color: '#86868b',
        fontSize: 10,
    },
    startButton: {
        height: 50,
        borderRadius: 10,
        backgroundColor: '#1d1d1f',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    stopButton: {
        backgroundColor: '#ff3b30',
    },
    startButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e5e5ea',
        paddingTop: 12,
    },
    navButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIcon: {
        width: 32,
        height: 32,
        borderWidth: 2,
        borderColor: '#86868b',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    navIconActive: {
        borderColor: '#1d1d1f',
        backgroundColor: '#1d1d1f',
    },
    navIconLine: {
        width: 14,
        height: 2,
        borderRadius: 1,
        backgroundColor: '#86868b',
    },
    navIconLineActive: {
        width: 3,
        height: 18,
        backgroundColor: '#fff',
    },
});
