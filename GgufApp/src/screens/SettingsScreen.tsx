import React from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {useAppStore} from '../store';

export const SettingsScreen = () => {
  const {systemPrompt, setSystemPrompt, temperature, setTemperature} =
    useAppStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Model Settings</Text>

      <View style={styles.section}>
        <Text style={styles.label}>System Prompt:</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          Temperature ({temperature.toFixed(2)}):
        </Text>
        <TextInput
          style={styles.input}
          value={temperature.toString()}
          keyboardType="numeric"
          onChangeText={val => setTemperature(parseFloat(val) || 0)}
        />
        <Text style={styles.hint}>
          Higher values make output more random, lower makes it more
          deterministic.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333'},
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  label: {fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 10},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    color: '#000',
    backgroundColor: '#fff',
  },
  multiline: {minHeight: 100, textAlignVertical: 'top'},
  hint: {fontSize: 12, color: '#888', marginTop: 5},
});
