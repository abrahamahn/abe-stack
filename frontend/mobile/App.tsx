import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#333' : '#fff',
    flex: 1,
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={backgroundStyle}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
          <View style={styles.container}>
            <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
              Abe Stack Mobile
            </Text>
            <Text style={[styles.subtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Welcome to the React Native mobile application!
            </Text>
            <Text style={[styles.text, { color: isDarkMode ? '#aaa' : '#444' }]}>
              This is a basic scaffold. Start building your mobile app here.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default App;
