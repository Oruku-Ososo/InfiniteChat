import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import {initLlama, LlamaContext} from 'llama.rn';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';

const db = SQLite.openDatabase(
  {name: 'chat.db', location: 'default'},
  () => {},
  error => {
    console.log(error);
  },
);

type Message = {role: 'system' | 'user' | 'assistant'; content: string};

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const [modelPath, setModelPath] = useState<string | null>(null);
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Settings
  const [temperature, setTemperature] = useState<number>(0.7);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a helpful AI assistant.',
  );

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? false);
    });

    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS Messages (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, content TEXT)',
        [],
        () => console.log('Table created successfully'),
        error => console.log('Error creating table ' + error.message),
      );
      tx.executeSql('SELECT * FROM Messages', [], (tx, results) => {
        let rows: Message[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          rows.push({
            role: results.rows.item(i).role,
            content: results.rows.item(i).content,
          });
        }
        setHistory(rows);
      });
    });

    AsyncStorage.getItem('modelPath').then(path => {
      if (path) {
        setModelPath(path);
      }
    });
    AsyncStorage.getItem('temperature').then(val => {
      if (val) {
        setTemperature(parseFloat(val));
      }
    });
    AsyncStorage.getItem('systemPrompt').then(val => {
      if (val) {
        setSystemPrompt(val);
      }
    });
  }, []);

  const downloadDefaultModel = async () => {
    // A placeholder small model URL
    const url =
      'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
    const destPath = `${RNFS.DocumentDirectoryPath}/tinyllama.gguf`;

    setLoading(true);
    try {
      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
      }).promise;
      if (result.statusCode === 200) {
        setModelPath(destPath);
        AsyncStorage.setItem('modelPath', destPath);
      }
    } catch (e) {
      console.error(e);
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
        AsyncStorage.setItem('modelPath', uri);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error(err);
      }
    }
  };

  const loadModel = async () => {
    if (!modelPath) {
      return;
    }
    setLoading(true);
    try {
      const exists = await RNFS.exists(modelPath);
      if (!exists) {
        console.error('Model file does not exist at path:', modelPath);
        return;
      }
      const llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 0,
      });
      setContext(llamaContext);
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    AsyncStorage.setItem('temperature', temperature.toString());
    AsyncStorage.setItem('systemPrompt', systemPrompt);
  };

  const clearHistory = () => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM Messages', [], () => {
        setHistory([]);
      });
    });
  };

  const generateText = async () => {
    if (!context || !prompt) {
      return;
    }

    const userPrompt = prompt;
    setPrompt('');
    setIsGenerating(true);
    setCurrentResponse('');

    const newUserMsg: Message = {role: 'user', content: userPrompt};
    setHistory(prev => [...prev, newUserMsg]);

    db.transaction(tx => {
      tx.executeSql('INSERT INTO Messages (role, content) VALUES (?, ?)', [
        'user',
        userPrompt,
      ]);
    });

    let fullResponseTokens: string[] = [];

    try {
      await context.completion(
        {
          messages: [
            {role: 'system', content: systemPrompt},
            ...history,
            newUserMsg,
          ],
          n_predict: 400,
          stop: ['</s>', '<|end|>', '<|eot_id|>'],
          temperature: temperature,
        },
        (data: any) => {
          fullResponseTokens.push(data.token);
          setCurrentResponse(fullResponseTokens.join(''));
        },
      );

      const fullResponse = fullResponseTokens.join('');

      const newAssistantMsg: Message = {
        role: 'assistant',
        content: fullResponse,
      };
      setHistory(prev => [...prev, newAssistantMsg]);

      db.transaction(tx => {
        tx.executeSql('INSERT INTO Messages (role, content) VALUES (?, ?)', [
          'assistant',
          fullResponse,
        ]);
      });
    } catch (error) {
      console.error('Error generating text:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Error generating response.',
      };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      setCurrentResponse('');
    }
  };

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({animated: true})
        }
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View style={styles.container}>
          <Text style={styles.title}>GGUF LLM Runner MVP</Text>

          {!isConnected && (
            <Text style={{color: 'red'}}>No internet connection</Text>
          )}

          <View style={styles.section}>
            <Text style={styles.subtitle}>Setup</Text>
            <Button
              title="1. Download Default Model"
              onPress={downloadDefaultModel}
              disabled={loading}
            />
            <View style={styles.spaceSmall} />
            <Button title="2. Pick GGUF Model" onPress={pickModel} />
            {modelPath && (
              <Text style={styles.text}>
                Selected: {modelPath.split('/').pop()}
              </Text>
            )}
            <View style={styles.spaceSmall} />
            <Button
              title="3. Load Model"
              onPress={loadModel}
              disabled={!modelPath || loading || !!context}
            />
            {loading && <ActivityIndicator style={styles.loader} />}
            {context && <Text style={styles.success}>Model Loaded!</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Settings</Text>
            <Text>System Prompt:</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              onBlur={saveSettings}
            />
            <Text>Temperature ({temperature.toFixed(2)}):</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={temperature.toString()}
              keyboardType="numeric"
              onChangeText={val => setTemperature(parseFloat(val) || 0)}
              onBlur={saveSettings}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.subtitle}>Chat History</Text>
              <Button title="Clear" onPress={clearHistory} />
            </View>

            {history.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}>
                <Text
                  style={
                    msg.role === 'user' ? styles.userText : styles.assistantText
                  }>
                  {msg.content}
                </Text>
              </View>
            ))}
            {isGenerating && currentResponse ? (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <Text style={styles.assistantText}>{currentResponse}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="Enter prompt..."
              placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />
            <Button
              title="Generate"
              onPress={generateText}
              disabled={!context || isGenerating || !prompt}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 20},
  section: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#000'},
  text: {marginTop: 5, fontSize: 12, color: '#555'},
  success: {
    marginTop: 10,
    color: 'green',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loader: {marginTop: 10},
  spaceSmall: {height: 10},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: '#000',
  },
  inputDark: {color: '#fff', borderColor: '#555'},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '90%',
  },
  userBubble: {backgroundColor: '#007AFF', alignSelf: 'flex-end'},
  assistantBubble: {backgroundColor: '#e5e5ea', alignSelf: 'flex-start'},
  userText: {color: '#fff'},
  assistantText: {color: '#000'},
});

export default App;
