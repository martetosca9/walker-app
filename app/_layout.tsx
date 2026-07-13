import React from 'react';
import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="history" />
            <Stack.Screen name="workout-detail" />
            <Stack.Screen name="walk" />
        </Stack>
    );
}
