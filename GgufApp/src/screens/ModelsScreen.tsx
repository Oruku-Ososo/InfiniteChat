import React, {useState} from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import {useAppStore} from '../store';
import {config} from '../config';
import {loadLlamaModel} from '../services/llama';

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
};

export const ModelsScreen = () => {
  const {modelPath, setModelPath, isModelLoaded, setIsModelLoaded} =
    useAppStore();
  const [loading, setLoading] = useState(false);

  const checkRamAndLoad = async (path: string) => {
    try {
      const totalMemory = await DeviceInfo.getTotalMemory();
      const totalMemoryGB = totalMemory / (1024 * 1024 * 1024);

      // Basic heuristic: Models often need >2GB RAM.
      if (totalMemoryGB < 3) {
        Alert.alert(
          'Low Memory Warning',
          'Your device has less than 3GB of RAM. Loading large models may cause the app to crash. Do you want to proceed?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Proceed', onPress: () => performLoad(path)},
          ],
        );
      } else {
        performLoad(path);
      }
    } catch (e) {
      console.warn('Could not determine device RAM, proceeding with load.');
      performLoad(path);
    }
  };

  const performLoad = async (path: string) => {
    setLoading(true);
    const success = await loadLlamaModel(path);
    setIsModelLoaded(success);
    setLoading(false);
    if (success) {
      Alert.alert('Success', 'Model loaded successfully!');
    } else {
      Alert.alert('Error', 'Failed to load the model.');
    }
  };

  const downloadDefaultModel = async () => {
    const destPath = `${RNFS.DocumentDirectoryPath}/${config.defaultModelFilename}`;
    setLoading(true);
    try {
      const result = await RNFS.downloadFile({
        fromUrl: config.defaultModelUrl,
        toFile: destPath,
      }).promise;
      if (result.statusCode === 200) {
        setModelPath(destPath);
        Alert.alert('Download Complete', 'Default model downloaded.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Download Failed', 'Could not download the default model.');
    } finally {
      setLoading(false);
    }
  };

  const pickModel = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      if (result && result.length > 0) {
        let uri = result[0].uri;
        if (uri.startsWith('content://')) {
          const safeName = sanitizeFilename(result[0].name || 'model.gguf');
          const destPath = `${RNFS.DocumentDirectoryPath}/${safeName}`;
          await RNFS.copyFile(uri, destPath);
          uri = destPath;
        }
        setModelPath(uri);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error(err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Models</Text>

      <View style={styles.section}>
        <Button
          title="1. Download Default TinyLlama"
          onPress={downloadDefaultModel}
          disabled={loading}
        />
        <View style={styles.space} />
        <Button
          title="2. Pick Local GGUF Model"
          onPress={pickModel}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Selected Model:</Text>
        <Text style={styles.value}>
          {modelPath ? modelPath.split('/').pop() : 'None'}
        </Text>
        <View style={styles.space} />
        <Button
          title="3. Load Model into Memory"
          onPress={() => checkRamAndLoad(modelPath!)}
          disabled={!modelPath || loading}
        />
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      )}
      {isModelLoaded && !loading && (
        <Text style={styles.success}>Model is loaded and ready for chat!</Text>
      )}
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
  space: {height: 15},
  label: {fontSize: 16, fontWeight: 'bold', color: '#555'},
  value: {fontSize: 14, color: '#888', marginTop: 5, marginBottom: 10},
  loader: {marginTop: 20},
  success: {
    marginTop: 20,
    fontSize: 16,
    color: 'green',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
