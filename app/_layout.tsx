import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Walker' }} />
            <Stack.Screen name="walk" options={{ title: 'Walk' }} />
            <Stack.Screen name="history" options={{ title: 'History' }} />
        </Stack>
    );
}
