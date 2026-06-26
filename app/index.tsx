import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Walker 🚶</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/walk')}>
                <Text style={styles.buttonText}>Start walk</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
    button: { backgroundColor: '#22c55e', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 12 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
