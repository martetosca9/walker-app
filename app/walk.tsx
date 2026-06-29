import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

type Coordinate = {
    latitude: number;
    longitude: number;
};

export default function Walk() {
    const [coords, setCoords] = useState<Coordinate[]>([]);
    const [tracking, setTracking] = useState(false);
    const [location, setLocation] = useState<Coordinate | null>(null);
    const watchRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
        })();
    }, []);

    const startTracking = async () => {
        setTracking(true);
        watchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (loc) => {
                const newCoord = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                setCoords((prev) => [...prev, newCoord]);
                setLocation(newCoord);
            }
        );
    };

    const stopTracking = () => {
        watchRef.current?.remove();
        setTracking(false);
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                region={
                    location
                        ? { ...location, latitudeDelta: 0.005, longitudeDelta: 0.005 }
                        : undefined
                }
                showsUserLocation
            >
                {coords.length > 1 && (
                    <Polyline coordinates={coords} strokeColor="#22c55e" strokeWidth={4} />
                )}
            </MapView>

            <View style={styles.controls}>
                <Text style={styles.info}>Puntos: {coords.length}</Text>
                {!tracking ? (
                    <TouchableOpacity style={styles.button} onPress={startTracking}>
                        <Text style={styles.buttonText}>Iniciar</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.button, styles.stop]} onPress={stopTracking}>
                        <Text style={styles.buttonText}>Detener</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    controls: {
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        gap: 12,
    },
    info: { fontSize: 16, color: '#555' },
    button: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    stop: { backgroundColor: '#ef4444' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});