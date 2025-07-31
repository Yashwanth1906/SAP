from hdbcli import dbapi
import threading
from contextlib import contextmanager
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DB_CONFIG = {
    "address": os.getenv("DB_URL"),
    "port": 443,
    "user": os.getenv("DB_USER"),
    "password": os.getenv("PASSWORD"),
    "encrypt": True,
    "sslValidateCertificate": False
}

class DatabaseManager:
    _instance = None
    _lock = threading.Lock()
    _connection = None
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DatabaseManager, cls).__new__(cls)
        return cls._instance
    
    def get_connection(self):
        if self._connection is None or not self._connection.isconnected():
            try:
                self._connection = dbapi.connect(**DB_CONFIG)
            except Exception as e:
                raise Exception(f"Failed to connect to database: {str(e)}")
        return self._connection
    
    def close_connection(self):
        if self._connection and self._connection.isconnected():
            self._connection.close()
            self._connection = None
    
    @contextmanager
    def get_cursor(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            
db_manager = DatabaseManager() 