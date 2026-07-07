import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

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

        const loc = await Location.getCurrentPositionAsync({});

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

const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                        { transform: [{ rotate: `${index * 45}deg` }, { translateY: -17 }] },
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
                <View style={[styles.signalBar, { height: 12 }]} />
                <View style={[styles.signalBar, { height: 18 }]} />
                <View style={[styles.signalBar, { height: 24 }]} />
                <View style={[styles.signalBar, { height: 30 }]} />
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
                            <Text style={styles.walkBadge}>W</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                            <BellIcon />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.titleRow}>
                    <View>
                        <Text style={styles.title}>Walk</Text>
                        <Text style={styles.subtitle}>Choose your activity</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                        <GearIcon />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View style={styles.mapControls}>
                <TouchableOpacity style={styles.squareMapButton} activeOpacity={0.75}>
                    <GpsIcon />
                    <Text style={styles.gpsText}>GPS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.routeButton} activeOpacity={0.8}>
                    <Text style={styles.routeText}>Load Route</Text>
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
                        <Text style={styles.metricValue}>{distance.toFixed(1)}</Text>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricUnit}>(km)</Text>
                    </View>

                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue}>{formatDuration(elapsedSeconds)}</Text>
                        <Text style={styles.metricLabel}>Duration</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    activeOpacity={0.85}
                    onPress={tracking ? stopTracking : startTracking}
                >
                    <Text style={styles.startButtonText}>
                        {tracking ? 'STOP WORKOUT' : 'START WORKOUT'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.bottomNav}>
                    <BottomNavIcon active />
                    <BottomNavIcon />
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
        backgroundColor: '#fff',
    },
    map: {
        ...StyleSheet.absoluteFill,
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingBottom: 18,
    },
    topBar: {
        minHeight: 88,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    title: {
        color: '#050505',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 0,
    },
    subtitle: {
        color: '#6f6f6f',
        fontSize: 24,
        lineHeight: 32,
        letterSpacing: 0,
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roundIconButton: {
        width: 44,
        height: 44,
        borderWidth: 4,
        borderColor: '#111',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walkBadge: {
        color: '#111',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0,
    },
    menuIcon: {
        width: 38,
        gap: 6,
    },
    menuLine: {
        height: 4,
        backgroundColor: '#222',
        borderRadius: 2,
    },
    bellIcon: {
        width: 30,
        height: 34,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bellDome: {
        width: 24,
        height: 24,
        borderWidth: 4,
        borderColor: '#111',
        borderBottomWidth: 0,
        borderTopLeftRadius: 13,
        borderTopRightRadius: 13,
    },
    bellBase: {
        width: 30,
        height: 8,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderColor: '#111',
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
    },
    bellClapper: {
        width: 8,
        height: 4,
        borderRadius: 4,
        backgroundColor: '#111',
        marginTop: -1,
    },
    gearIcon: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gearTooth: {
        position: 'absolute',
        width: 10,
        height: 12,
        borderRadius: 2,
        backgroundColor: '#000',
    },
    gearOuter: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gearInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#fff',
    },
    mapControls: {
        position: 'absolute',
        top: 245,
        left: 28,
        right: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    squareMapButton: {
        width: 80,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    gpsIcon: {
        width: 40,
        height: 34,
        justifyContent: 'flex-end',
    },
    signalBars: {
        height: 30,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 3,
    },
    signalBar: {
        width: 4,
        backgroundColor: '#999',
    },
    signalSlash: {
        position: 'absolute',
        left: 2,
        top: 15,
        width: 42,
        height: 3,
        backgroundColor: '#777',
        transform: [{ rotate: '-28deg' }],
    },
    gpsText: {
        color: '#111',
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 20,
        letterSpacing: 0,
    },
    routeButton: {
        height: 86,
        minWidth: 210,
        paddingHorizontal: 32,
        borderRadius: 2,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    routeText: {
        color: '#111',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0,
    },
    locationArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 14,
        borderBottomWidth: 40,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#111',
        transform: [{ rotate: '8deg' }],
    },
    locationArrowWing: {
        position: 'absolute',
        left: -8,
        top: 12,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 22,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 330,
        paddingHorizontal: 28,
        paddingTop: 22,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    dragHandle: {
        alignSelf: 'center',
        width: 82,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#d0d0d0',
        marginBottom: 26,
    },
    metrics: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        marginBottom: 28,
    },
    metricBlock: {
        width: 150,
        alignItems: 'center',
    },
    metricValue: {
        color: '#000',
        fontSize: 62,
        lineHeight: 72,
        fontWeight: '900',
        letterSpacing: 0,
    },
    metricLabel: {
        color: '#111',
        fontSize: 28,
        lineHeight: 34,
        letterSpacing: 0,
    },
    metricUnit: {
        color: '#111',
        fontSize: 28,
        lineHeight: 34,
        letterSpacing: 0,
    },
    startButton: {
        height: 70,
        borderRadius: 6,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: 0,
    },
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    navIcon: {
        width: 42,
        height: 42,
        borderWidth: 3,
        borderColor: '#a3a3a3',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    navIconActive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderColor: '#1d2730',
        backgroundColor: '#1d2730',
    },
    navIconLine: {
        width: 22,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#a3a3a3',
    },
    navIconLineActive: {
        width: 4,
        height: 26,
        backgroundColor: '#fff',
    },
});
