import SQLite from 'react-native-sqlite-storage';
import {config} from '../config';

const db = SQLite.openDatabase(
  {name: config.databaseName, location: config.databaseLocation},
  () => console.log('Database connected'),
  error => console.error('Database connection error:', error),
);

export type MessageRow = {
  id?: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const initDB = () => {
  db.transaction(
    tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS Messages (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, content TEXT)',
        [],
        () => console.log('Messages table created successfully'),
        (_tx, error) => {
          console.error('Error creating table:', error);
          return false;
        },
      );
    },
    error => console.error('Transaction error during init:', error),
  );
};

export const loadHistory = (callback: (messages: MessageRow[]) => void) => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM Messages ORDER BY id ASC',
      [],
      (_tx, results) => {
        let rows: MessageRow[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          rows.push({
            id: results.rows.item(i).id,
            role: results.rows.item(i).role,
            content: results.rows.item(i).content,
          });
        }
        callback(rows);
      },
      (_tx, error) => {
        console.error('Error loading history:', error);
        return false;
      },
    );
  });
};

export const saveMessage = (role: string, content: string) => {
  db.transaction(tx => {
    tx.executeSql(
      'INSERT INTO Messages (role, content) VALUES (?, ?)',
      [role, content],
      () => {},
      (_tx, error) => {
        console.error('Error saving message:', error);
        return false;
      },
    );
  });
};

export const clearHistory = (callback: () => void) => {
  db.transaction(tx => {
    tx.executeSql(
      'DELETE FROM Messages',
      [],
      () => callback(),
      (_tx, error) => {
        console.error('Error clearing history:', error);
        return false;
      },
    );
  });
};
